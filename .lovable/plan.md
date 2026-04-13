

# Edge Function `settle-gateway-payment` + Integração Frontend

## Resumo
Criar a Edge Function que faz a baixa no Asaas (receiveInCash) respeitando os 3 pontos críticos levantados, e conectar o frontend.

## 1. Nova Edge Function: `supabase/functions/settle-gateway-payment/index.ts`

**Fluxo:**
1. Receber `{ paymentId, paidDate, paidAmount, syncWithGateway }` do body
2. Validar JWT via header `Authorization` + `getClaims()`
3. Criar cliente Supabase com o auth header do request (RLS do utilizador)
4. Buscar o `client_payments` pelo ID (retorna `asaas_payment_id`, `agency_id`, etc.)
5. Verificar que o utilizador pertence à agência (RLS já garante, mas validar explicitamente)
6. **Se `syncWithGateway === true`:**
   - Criar cliente service_role para ler `agency_payment_settings` (tabela com RLS restrita)
   - Buscar `asaas_api_key` e `asaas_sandbox` da agência
   - Montar URL: sandbox → `https://sandbox.asaas.com/api/v3/payments/{id}/receiveInCash` / produção → `https://api.asaas.com/v3/payments/{id}/receiveInCash`
   - POST com body: `{ paymentDate, value, notifyCustomer: false }`
   - Header: `access_token: {asaas_api_key}`
   - Tratar erro da API do Asaas
7. Atualizar `client_payments`: `status: 'paid'`, `paid_date`, `amount_paid` (via cliente do utilizador com RLS)
8. Retornar sucesso com CORS headers

**Padrão de autenticação (ponto 3 do user):**
```ts
const authHeader = req.headers.get('Authorization')!;
const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
// Validar claims
const { data: claims } = await userClient.auth.getClaims(token);
```

**Service role apenas para ler API keys:**
```ts
const adminClient = createClient(url, serviceRoleKey);
const { data: settings } = await adminClient.from('agency_payment_settings')
  .select('asaas_api_key, asaas_sandbox')
  .eq('agency_id', agencyId)
  .single();
```

## 2. `supabase/config.toml`
Adicionar entry:
```toml
[functions.settle-gateway-payment]
verify_jwt = false
```

## 3. Frontend: `PaymentSheet.tsx`

**`handleSyncSettlement`** — descomentar e passar `syncWithGateway: true`:
```ts
const { data, error } = await supabase.functions.invoke('settle-gateway-payment', {
  body: { paymentId: payment.id, paidDate: pendingSettlement.paidDate, paidAmount: pendingSettlement.paidAmount, syncWithGateway: true }
});
```
Remover o fallback `executeLocalSettlement` — a Edge Function já faz o update local.

**`handleLocalOnlySettlement`** — também chamar a Edge Function mas com `syncWithGateway: false`:
```ts
const { data, error } = await supabase.functions.invoke('settle-gateway-payment', {
  body: { paymentId: payment.id, paidDate: pendingSettlement.paidDate, paidAmount: pendingSettlement.paidAmount, syncWithGateway: false }
});
```
Isto centraliza a lógica de update num único ponto (a Edge Function).

## Arquivos modificados
- `supabase/functions/settle-gateway-payment/index.ts` (novo)
- `supabase/config.toml` (nova entry)
- `src/components/admin/PaymentSheet.tsx` (descomentar invoke, remover fallback local)

## Sem migration
Nenhuma alteração de schema necessária. Todos os campos já existem.

