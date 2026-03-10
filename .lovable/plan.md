

# Refatoração: WhatsApp Evolution API Centralizada

## Contexto
Atualmente cada agência precisa fornecer URL, API Key e nome da instância manualmente. O novo modelo centraliza tudo em um único servidor Evolution (`https://senseys-evolution.cloudfy.cloud`) com API Key global (`3R4MZIGtr4A8tCIDguMsxFU3JURk3B6r`), simplificando o fluxo para: **clique em "Conectar" → QR Code aparece → escaneie → pronto**.

## Arquitetura

```text
Usuário Orbity (clica "Conectar WhatsApp")
      │
      ▼
Edge Function whatsapp-connect
      │ POST /instance/create  (orbity_{agency_id})
      │ POST /webhook/set       (webhook → Supabase)
      │ GET  /instance/connect  (QR Code)
      ▼
Evolution API Central (senseys-evolution.cloudfy.cloud)
      │
      │ webhook events
      ▼
Edge Function whatsapp-webhook
      │
      ▼
whatsapp_messages / automation engine
```

## Mudanças

### 1. Adicionar Supabase Secrets
- `EVOLUTION_API_URL` = `https://senseys-evolution.cloudfy.cloud`
- `EVOLUTION_API_KEY` = `3R4MZIGtr4A8tCIDguMsxFU3JURk3B6r`

### 2. Migration: Tornar `api_url` e `api_key` opcionais na tabela `whatsapp_accounts`
As colunas `api_url` e `api_key` deixam de ser obrigatórias (a URL/Key agora são secrets globais). Adicionar defaults vazios para retrocompatibilidade.

```sql
ALTER TABLE whatsapp_accounts 
  ALTER COLUMN api_url SET DEFAULT '',
  ALTER COLUMN api_key SET DEFAULT '';
```

### 3. Refatorar `whatsapp-connect/index.ts`
- Ler `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` dos secrets (não mais do body/DB)
- Gerar `instance_name` automaticamente: `orbity_{agency_id_short}` (primeiros 8 chars do UUID)
- **action: connect** → Não pede mais URL/Key/nome. Apenas cria instância, configura webhook, retorna QR
- **action: status/disconnect/refresh_qr** → Usa secrets em vez de `account.api_url`/`account.api_key`
- Salvar a URL/Key centrais no DB por retrocompatibilidade (para `whatsapp-send` e `process-queue`)

### 4. Refatorar `whatsapp-send/index.ts`
- Ler `EVOLUTION_API_URL` e `EVOLUTION_API_KEY` dos secrets como fallback quando `account.api_url` está vazio

### 5. Refatorar `process-whatsapp-queue/index.ts`
- Mesma lógica: usar secrets como fallback para URL/Key da Evolution

### 6. Refatorar `whatsapp-webhook/index.ts`
- Lookup de instância: já busca por `instance_name`, funciona automaticamente com o novo padrão `orbity_*`
- Sem mudanças necessárias no webhook

### 7. Refatorar UI: `WhatsAppIntegration.tsx`
- Remover os 3 campos de formulário (URL, API Key, Nome da Instância)
- Botão único: **"Conectar WhatsApp"** → chama `connect.mutate({})` sem parâmetros
- QR Code aparece automaticamente
- Manter: status, desconectar, verificar status

### 8. Refatorar hook: `useWhatsApp.tsx`
- `connect` mutation: não recebe mais parâmetros (URL/Key/instance)
- O body enviado é apenas `{ action: 'connect', agency_id }`

## Arquivos alterados
1. `supabase/functions/whatsapp-connect/index.ts` — usar secrets, auto-gerar instance name
2. `supabase/functions/whatsapp-send/index.ts` — fallback para secrets
3. `supabase/functions/process-whatsapp-queue/index.ts` — fallback para secrets
4. `src/components/settings/WhatsAppIntegration.tsx` — UI simplificada (1 botão)
5. `src/hooks/useWhatsApp.tsx` — remover parâmetros do connect
6. Migration SQL — defaults para api_url/api_key

