

# Remover Toggle Sandbox do Asaas — Forçar Produção

## Contexto
O erro `invalid_environment` ocorre porque `asaas_sandbox` está `true` no banco, mas a API key é de produção (`$aact_prod_...`). O toggle sandbox é desnecessário — quando o usuário cadastra sua key, já está pronto para produção.

## Alterações

### 1. `src/components/settings/AsaasIntegration.tsx`
- Remover o state `sandbox` e o bloco de UI do toggle "Ambiente" (Sandbox/Produção)
- No `handleSave`, enviar sempre `asaas_sandbox: false` (produção)

### 2. `supabase/functions/create-gateway-charge/index.ts`
- Remover condicional sandbox. Usar sempre `https://api.asaas.com` como baseUrl

### 3. `supabase/functions/settle-gateway-payment/index.ts`
- Mesmo ajuste: remover condicional, usar sempre URL de produção
- Remover `asaas_sandbox` do select da query

### 4. Corrigir dado atual no banco
- O registro atual tem `asaas_sandbox: true`. O `handleSave` ao salvar com `asaas_sandbox: false` corrigirá automaticamente na próxima interação do usuário com o card do Asaas.

### 5. Deploy das Edge Functions alteradas
- Deploy de `create-gateway-charge` e `settle-gateway-payment`

## Arquivos alterados
1. `src/components/settings/AsaasIntegration.tsx`
2. `supabase/functions/create-gateway-charge/index.ts`
3. `supabase/functions/settle-gateway-payment/index.ts`

