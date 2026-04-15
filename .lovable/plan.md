

# Implementar UI de Webhook no AsaasIntegration.tsx

## Arquivo alterado
`src/components/settings/AsaasIntegration.tsx` — reescrita completa

## Alterações

### 1. Novos imports
- `Alert, AlertDescription` de `@/components/ui/alert`
- `Copy, Info, CheckCircle2` de `lucide-react`
- `useAgency` de `@/hooks/useAgency`

### 2. Novos estados e lógica
- `webhookToken` / `showWebhookToken` — estado para o token do webhook
- `agencyId` via `useAgency().currentAgency?.id`
- URL dinâmica: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook?gateway=asaas&agency_id=${agencyId}`
- Se `agencyId` não existir, exibe skeleton no lugar da URL
- `handleCopyUrl` — copia URL para clipboard com feedback via toast
- `handleSave` inclui `asaas_webhook_token: webhookToken || null`
- `useEffect` preenche `webhookToken` com `settings.asaas_webhook_token`

### 3. Nova seção de Webhook (abaixo da API Key)
- Separator
- Título com ícone Info: "Configuração de Webhook (Retorno de Pagamento)"
- Input read-only com URL + botão Copiar
- Input password com toggle para Token de Autenticação

### 4. Painel de instruções (Alert azul claro)
Guia numerado com 6 passos:
1. Acessar Menu → Integrações → Webhooks → "Criar Webhook"
2. Nomear e colar URL
3. Gerar token no Asaas, colar no Orbity
4. Manter fila de sincronização e webhook ativados
5. **⚠️ IMPORTANTE** — Selecionar eventos obrigatórios com badges mono: `PAYMENT_CREATED`, `PAYMENT_UPDATED`, `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`, `PAYMENT_REFUNDED` (cada um com descrição)
6. Salvar em ambos os lados

### 5. Botão "Salvar e Conectar" (sem alteração)

## Nenhuma migração de banco necessária
O campo `asaas_webhook_token` já existe na tabela `agency_payment_settings`.

