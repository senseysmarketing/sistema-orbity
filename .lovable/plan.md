## Objetivo

Refatorar o `master-whatsapp` (WhatsApp oficial Orbity no Painel Master) para usar a mesma arquitetura Uazapi v2 já validada nas agências, com máquina de estados confiável, persistência limpa em `system_config.master_whatsapp_instance`, logs auditáveis e UI alinhada (sem QR fantasma, sem polling infinito).

Escopo desta fase: somente a conexão + envio (`send_message`) usado hoje pelo onboarding e `check-subscription`. Não vamos criar ainda `send-onboarding-verification`, `verify-onboarding-code` nem o cron de trial/boas-vindas — ficam mapeados como fase 2.

---

## 1. Backend — refatorar `supabase/functions/master-whatsapp/index.ts`

Reescrever do zero reutilizando os helpers compartilhados já existentes em `supabase/functions/_shared/uazapi.ts`:

- `createOrGetInstance`, `connectInstance`, `getInstanceStatus`, `disconnectInstance`, `deleteInstance`, `parseQrCode`, `parseStatus`, `parsePhoneNumber`, `sendText`.

Configuração fixa da instância oficial:

- `instance_name = "orbity_master_official"`
- `purpose = "master_official"`
- `adminField01 = "orbity_master"`, `adminField02 = "official"`

### Estado persistido em `system_config['master_whatsapp_instance']`

```json
{
  "provider": "uazapi",
  "instance_name": "orbity_master_official",
  "token": "...",
  "status": "disconnected | provisioning | qr_pending | connected | error",
  "provider_status": "...",
  "phone_number": "...",
  "qr_code": null,
  "last_error": null,
  "last_checked_at": "...",
  "connected_at": "...",
  "updated_at": "..."
}
```

Helper interno `saveState(patch)` faz merge + `updated_at` + `last_checked_at` e grava via service role.

### Ações suportadas

Validação: todas exceto `send_message` exigem `is_master_agency_admin` do usuário chamador. `send_message` é interno (chamado por `agency-onboarding`, `check-subscription`, `CompanyDataStep`) — exigir JWT válido de qualquer usuário autenticado (mantém comportamento atual; chamado server-side em edges usa service role).

1. **`debug_health`** — retorna config Uazapi presente + estado bruto salvo + ping `/instance/status` se houver token.
2. **`connect`**
   - `createOrGetInstance("orbity_master_official", {...})` → grava token.
   - `connectInstance(token)`.
   - Aplica `parseStatus` + `parseQrCode` + `parsePhoneNumber`.
   - Se `qr` válido → `status=qr_pending`, salva `qr_code`.
   - Se já conectado → `status=connected`, `qr_code=null`, `phone_number`, `connected_at=now`.
   - Senão → `status=error`, `last_error="Uazapi não retornou QR Code"`.
3. **`status`**
   - Sem token → `disconnected`.
   - `getInstanceStatus(token)` → normaliza e persiste. Em 401/404 do provider → `status=error`, `last_error` claro sugerindo `hard_reset`.
4. **`refresh_qr`** — equivalente a `connect` quando não está `connected`.
5. **`disconnect`** — `disconnectInstance(token)`, salva `disconnected`, limpa `qr_code` e `phone_number`.
6. **`hard_reset`** — `deleteInstance(token)` (best-effort) + zera todo o estado salvo (token, qr, phone, status=`disconnected`, `last_error=null`).
7. **`send_message`** (`{ phone_number, message, context? }`)
   - Carrega estado. Sem token ou `status != connected` → 409 com mensagem: `"WhatsApp oficial Orbity desconectado. Reconecte no Painel Master."`
   - Se `last_checked_at` > 60s atrás → roda `status` antes.
   - `sendText({ api_key: token }, { number, text })`.
   - Loga em `master_whatsapp_logs` (sucesso ou falha). Nunca loga o `message` cru se `context='onboarding_otp'` (apenas marca `metadata.context`).
   - Retorna `{ success, provider_message_id, status }`.

### Regras invioláveis
- Nunca salvar `qr_pending` sem `qr_code` válido.
- Nunca salvar `connected` sem `phone_number`.
- Em qualquer erro do provider → `status=error` + `last_error` legível.
- Nunca logar `token` nem conteúdo de OTP.

---

## 2. Migração — tabela `master_whatsapp_logs`

```text
master_whatsapp_logs
  id uuid pk default gen_random_uuid()
  action text not null         -- 'send_message' | 'connect' | 'status' | 'hard_reset' | ...
  phone_number text
  status text                  -- 'success' | 'error'
  error_message text
  provider_status text
  provider_message_id text
  metadata jsonb default '{}'
  created_at timestamptz default now()
```

RLS: `ENABLE`, política `SELECT` apenas para `is_master_agency_admin()`. INSERT só via service role (nenhuma policy de insert criada).
Índice por `created_at desc` e `action`.

---

## 3. Frontend — `src/components/master/MasterSystem.tsx`

Refatorar a aba Configurações > WhatsApp para espelhar o padrão do `useWhatsAppConnection` das agências:

- Criar hook local (ou inline com React Query) `useMasterWhatsApp()` que invoca `master-whatsapp` com as ações `status`, `connect`, `refresh_qr`, `disconnect`, `hard_reset`.
- `useQuery(['master-wa'])` com `queryFn: status`, `refetchInterval` só quando `status ∈ {provisioning, qr_pending}` (2s), `refetchOnWindowFocus: false`.
- Mutations isoladas com `onSuccess` que setam o cache.

### UI por estado

- `disconnected` → card explicativo + botão **Gerar Novo QR Code** (`connect`).
- `provisioning` → loader “Preparando instância…”.
- `qr_pending` → `<img src={qr_code}/>` + botão **Atualizar QR** (`refresh_qr`) + **Cancelar** (`hard_reset`).
- `connected` → exibe `phone_number`, badge verde, botões **Verificar status** (`status`) e **Desconectar** (`disconnect`).
- `error` → alerta vermelho com `last_error`, botões **Tentar novamente** (`refresh_qr`) e **Hard Reset** (`hard_reset`).

Remover qualquer lógica que “preserva QR antigo” quando o backend não retorna mais QR — o estado vem 100% do servidor.

Os callers `onboarding/CompanyDataStep.tsx`, `agency-onboarding`, `check-subscription` continuam chamando `master-whatsapp { action: 'send_message', phone_number, message }` sem alteração de contrato.

---

## 4. Fora de escopo (mapeado para fase 2)

- Edges `send-onboarding-verification` / `verify-onboarding-code` + tabela `onboarding_verification_codes` (mover OTP do frontend para o backend).
- Cron `process-master-whatsapp-notifications` para boas-vindas, trial acabando, trial expirado, avisos oficiais (usar `trial_settings` já existente).

Vou listar essas como TODOs para próxima rodada, sem implementar agora.

---

## 5. Critério de sucesso

1. No Painel Master, “Gerar Novo QR Code” mostra QR em poucos segundos.
2. Escanear → status muda para `connected` automaticamente (polling 2s).
3. Onboarding (`CompanyDataStep`) envia OTP via `send_message` com sucesso.
4. Desconectar/expirar → painel mostra erro claro e permite **Hard Reset** sem deixar token zumbi.
5. Nenhum log expõe token nem conteúdo de OTP.

---

## Arquivos afetados

- `supabase/functions/master-whatsapp/index.ts` — reescrita completa.
- `supabase/migrations/<novo>.sql` — criar `master_whatsapp_logs` + RLS.
- `src/components/master/MasterSystem.tsx` — refatorar bloco WhatsApp + hook local React Query.
- (Nenhuma mudança em `agency-onboarding`, `check-subscription`, `CompanyDataStep` — contrato `send_message` preservado.)
