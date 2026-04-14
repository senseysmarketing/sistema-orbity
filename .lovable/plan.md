

# Edge Function `create-gateway-charge` — Plano Revisado

## Resumo

Criar Edge Function que centraliza toda emissao de cobrancas (manual + gateway). Inclui criacao dinamica de Customer no gateway quando o cliente nao possui ID externo. O frontend fica leve, apenas invocando a funcao.

## Arquivos

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/create-gateway-charge/index.ts` | Nova Edge Function |
| `src/hooks/useCreatePayment.ts` | Refatorar para invocar Edge Function em todos os casos |
| `supabase/config.toml` | Adicionar entry |

## Edge Function — Fluxo Completo

```text
Frontend → invoke('create-gateway-charge', body)
  │
  ├─ 1. Validar JWT (getClaims via userClient)
  ├─ 2. Validar input (client_id, amount, due_date, agency_id obrigatorios)
  ├─ 3. Buscar agency_payment_settings via adminClient (service role)
  ├─ 4. Buscar dados do cliente via userClient (name, email, document, asaas_customer_id, conexa_customer_id)
  │
  ├─ Se billing_type = 'manual':
  │     └─ Pular gateway, ir direto ao INSERT
  │
  ├─ Se billing_type = 'asaas':
  │     ├─ 4a. Verificar asaas_customer_id
  │     │     └─ Se NULL → POST /v3/customers { name, email, cpfCnpj }
  │     │         → UPDATE clients SET asaas_customer_id = response.id
  │     ├─ 4b. POST /v3/payments { customer, value, dueDate, billingType: 'UNDEFINED',
  │     │       description, fine, interest, discount }
  │     └─ 4c. Capturar: id → asaas_payment_id, invoiceUrl → invoice_url,
  │            pixCopiaECola → pix_copy_paste
  │
  ├─ Se billing_type = 'conexa':
  │     ├─ 4a. Verificar conexa_customer_id (mesma logica de upsert)
  │     ├─ 4b. POST endpoint Conexa (placeholder)
  │     └─ 4c. Capturar IDs e URLs correspondentes
  │
  └─ 5. INSERT client_payments com todos os campos (gateway IDs, URLs, pix)
       → Retornar registro inserido ao frontend
```

## Detalhes Tecnicos

### Customer Upsert (Asaas)
- Antes de criar cobranca, checar `client.asaas_customer_id`
- Se nulo: `POST {baseUrl}/v3/customers` com `{ name, email, cpfCnpj: client.document }`
- Salvar `response.id` em `clients.asaas_customer_id` via adminClient
- Usar o ID (existente ou recem-criado) no payload de `/v3/payments`

### Regras Financeiras
- Ler `default_fine_percentage`, `default_interest_percentage`, `discount_percentage`, `discount_days_before` do `agency_payment_settings`
- Mapear para Asaas: `fine: { value }`, `interest: { value }`, `discount: { value, dueDateLimitDays, type: 'PERCENTAGE' }`

### Captura do Response Asaas
- `response.id` → coluna `asaas_payment_id`
- `response.invoiceUrl` → coluna `invoice_url`
- `response.pixCopiaECola` → coluna `pix_copy_paste` (se disponivel)

### Frontend (`useCreatePayment.ts`)
- `createPayment` sempre chama `supabase.functions.invoke('create-gateway-charge', { body })`
- Remove todo insert direto no Supabase
- Trata erros da Edge Function
- `updatePayment` permanece inalterado (update local)

### Padrao seguido
- Mesmo padrao de auth do `settle-gateway-payment`: userClient com Authorization header + adminClient com service role para secrets
- CORS headers completos incluindo headers do Supabase client
- Todos os awaits antes do return (serverless lifecycle constraint)

