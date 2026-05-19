# Refactor da conexão WhatsApp/Uazapi

Escopo limitado: **somente conexão** (criar/recuperar instância, QR Code, status). Envio de mensagens, automações, fila, webhook de mensagens recebidas e chat do CRM ficam intocados.

## 1. Banco de dados (migration)

### Alterar `whatsapp_accounts`
Adicionar colunas (manter `api_key`, `qr_code`, `status`, `phone_number` existentes):
- `provider text NOT NULL DEFAULT 'uazapi'`
- `provider_status text` — status bruto retornado pela Uazapi
- `last_error text`
- `last_provider_payload jsonb` — último payload sanitizado (sem token/QR completo)
- `last_checked_at timestamptz`
- `connected_at timestamptz`

Atualizar CHECK do `status` (ou validation trigger) para o domínio:
`disconnected | provisioning | qr_pending | connected | error`

### Criar `whatsapp_connection_logs`
Colunas conforme spec do usuário. RLS:
- SELECT: membros owner/admin da `agency_id`
- INSERT: apenas service role (edge function)
Índice em `(agency_id, created_at desc)` e `(account_id, created_at desc)`.

## 2. Módulo compartilhado `supabase/functions/_shared/uazapi.ts`

Funções puras, sem acoplamento com Supabase:
- `getUazapiConfig()` — lê `UAZAPI_SERVER_URL` + `UAZAPI_ADMIN_TOKEN`, normaliza URL.
- `uazapiRequest(endpoint, { method, token?, adminToken?, body? })` — wrapper fetch único, retorna `{ ok, status, data, raw }` e nunca lança em erro HTTP.
- `createOrGetInstance(instanceName)` — usa endpoints corretos da Uazapi (`POST /instance/init` com `admintoken`); se já existir, busca via `GET /instance/all` e retorna token existente.
- `connectInstance(token)` — `POST /instance/connect` com header `token`.
- `getInstanceStatus(token)` — `GET /instance/status`.
- `disconnectInstance(token)` — `POST /instance/disconnect`.
- `deleteInstance(token)` — `POST /instance/delete` (usado só no hard_reset).
- `configureWebhook(token, url, events)` — `POST /webhook` com payload Uazapi.
- `parseQrCode(data)` — extrai `qrcode/base64/qr_code` e normaliza para data URL.
- `parseStatus(data)` — mapeia status bruto Uazapi (`connected`, `connecting`, `disconnected`, `qrcode`, `loading`, ...) para domínio interno.
- `parsePhoneNumber(data)` — extrai número do `instance.profilePicUrl`/`me.id`.

## 3. Edge Function `whatsapp-connect/index.ts` (reescrita)

### Entrada
```json
{ "action": "debug_health|connect|status|refresh_qr|disconnect|hard_reset",
  "agency_id": "...", "purpose": "general|billing" }
```

### Auth
Validar JWT (Authorization Bearer) → garantir `agency_users.role IN ('owner','admin')` via `assertAgencyAccess`.

### Helpers internos
- `getOrCreateAccount(agencyId, purpose)` — upsert em `whatsapp_accounts`.
- `setAccountState(id, patch)` — update parcial com `last_checked_at = now()`.
- `logEvent({...})` — insere em `whatsapp_connection_logs` (sem token/QR).

### Regra invariante
> Só persistir `status='qr_pending'` quando `qr_code` existir. Se Uazapi não retornar QR e não estiver conectado → `status='error'` + `last_error`.

### Fluxo `connect`
1. `getOrCreateAccount` → set `status='provisioning'`.
2. `createOrGetInstance(instance_name = 'orbity_{agency_id}_{purpose}')`.
3. Salvar `api_key = instance.token`.
4. `configureWebhook` (best-effort, falha não bloqueia).
5. `connectInstance(token)`.
6. Decisão:
   - status conectado → `connected`, limpa `qr_code`, salva `phone_number`, `connected_at`.
   - QR retornado → `qr_pending` + `qr_code`.
   - caso contrário → `error` + `last_error`.
7. Log + resposta `{ success, status, qr_code?, phone_number?, error? }`.

### Fluxo `status`
1. Se conta inexistente ou sem `api_key` → `disconnected`.
2. `getInstanceStatus(token)`.
3. Mapear → atualizar conta seguindo a invariante.
4. Se status bruto indicar "need qr" → chamar `connectInstance` para obter QR e salvar `qr_pending`.

### Fluxo `refresh_qr`
Reusa `connectInstance` sem recriar instância.

### Fluxo `disconnect`
`disconnectInstance` + zera `qr_code`, `phone_number`, `status='disconnected'`. Mantém token.

### Fluxo `hard_reset`
`deleteInstance` (best-effort) + apaga `api_key`, `qr_code`, `phone_number`, `instance_name`, status `disconnected`.

### Fluxo `debug_health`
Retorna config presente (sem secrets), ping na Uazapi (`GET /instance/all` com admin), e snapshot da conta.

## 4. Frontend

### Novo hook `src/hooks/useWhatsAppConnection.ts`
- `useQuery(['wa-conn', agencyId, purpose])` → invoca `whatsapp-connect` action `status`.
- `refetchInterval`: `(data) => ['provisioning','qr_pending'].includes(data?.status) ? 2000 : false`.
- `staleTime: 0` apenas neste query.
- Mutations: `connect`, `refreshQr`, `disconnect`, `hardReset` que invalidam o query.
- Sem polling manual com `setInterval`/múltiplos `useEffect`.

### Refator `WhatsAppInstanceCard.tsx`
Renderização dirigida puramente pelo `status`:
- `disconnected` → botão **Conectar WhatsApp**.
- `provisioning` → spinner "Preparando instância...".
- `qr_pending` + `qr_code` → `<img src={qr_code}/>` + dica "Escaneie no WhatsApp > Aparelhos conectados" + botão **Atualizar QR**.
- `qr_pending` sem `qr_code` → alerta + botão **Atualizar QR**.
- `connected` → badge verde, número, botões **Desconectar** / **Resetar conexão**.
- `error` → alerta com `last_error`, botões **Tentar novamente** e **Resetar conexão** (hard_reset).

Manter o restante de `WhatsAppIntegration.tsx` (toggle billing, relink orphans) como está.

## 5. Fora de escopo (não tocar)
- `whatsapp-send`, `process-whatsapp-queue`, `process-lead-qualification`
- `whatsapp-webhook` (recebimento de mensagens)
- Chat do CRM, automações, régua de cobrança

## 6. Critérios de aceite
- Click em Conectar → QR aparece em <5s.
- Uazapi sem QR → UI mostra erro acionável, não trava em "Conectando".
- Status nunca `qr_pending` sem `qr_code` no banco.
- Após escanear, próximo poll (≤2s) muda para `connected` sem refresh.
- Logs em `whatsapp_connection_logs` permitem auditar cada tentativa sem vazar token/QR.

## Detalhes técnicos (referência)

Endpoints Uazapi v2 usados:
- `POST /instance/init` (header `admintoken`, body `{ name }`)
- `GET  /instance/all` (header `admintoken`)
- `POST /instance/connect` (header `token`)
- `GET  /instance/status` (header `token`)
- `POST /instance/disconnect` (header `token`)
- `POST /instance/delete` (header `token`)
- `POST /webhook` (header `token`, body `{ url, events, enabled:true }`)

Secrets necessários (já presentes): `UAZAPI_SERVER_URL`, `UAZAPI_ADMIN_TOKEN`. Validar em `debug_health`.
