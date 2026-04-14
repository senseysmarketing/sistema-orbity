

# Integração Conexa v2 — Subdomínio + Product ID + Fluxo Sale

## Resumo

Adicionar `conexa_subdomain` e `conexa_default_product_id` ao banco/UI, e ativar o fluxo real na Edge Function: URL dinâmica com subdomínio do tenant, customer upsert via `POST /customer`, venda via `POST /sale` com `productId` obrigatório.

## Alterações

| Arquivo | O que muda |
|---------|-----------|
| Migration SQL | `ADD COLUMN conexa_subdomain TEXT, ADD COLUMN conexa_default_product_id INTEGER` |
| `src/hooks/usePaymentGateway.tsx` | Adicionar `conexa_subdomain` e `conexa_default_product_id` ao tipo e defaults |
| `src/components/settings/ConexaIntegration.tsx` | 2 novos inputs: Subdomínio e Product ID |
| `supabase/functions/create-gateway-charge/index.ts` | Ativar fluxo Conexa real com URL dinâmica e POST /sale |

## Migration

```sql
ALTER TABLE agency_payment_settings
  ADD COLUMN IF NOT EXISTS conexa_subdomain TEXT,
  ADD COLUMN IF NOT EXISTS conexa_default_product_id INTEGER;
```

## usePaymentGateway.tsx

- Add to `PaymentSettings`: `conexa_subdomain: string | null` e `conexa_default_product_id: number | null`
- Add to `defaultSettings`: `conexa_subdomain: null, conexa_default_product_id: null`

## ConexaIntegration.tsx

- New state: `subdomain` (string), `productId` (string for input, parsed to int on save)
- Initialize from `settings.conexa_subdomain` and `settings.conexa_default_product_id`
- Input "Subdomínio do Conexa" com helper: "Se você acessa minhaagencia.conexa.app, digite apenas minhaagencia"
- Input "ID do Produto Padrão" com helper: "ID do produto genérico cadastrado no Conexa (ex: Serviços de Agência)"
- `handleSave` envia `conexa_subdomain`, `conexa_default_product_id` junto com os demais
- Badge "Conectado" condicionado a `apiKey + subdomain + productId + gatewayActive`

## Edge Function — Conexa flow

Remover placeholder `CONEXA_BASE_URL` e o fallback local. Substituir por:

1. **Validações**: verificar `conexa_subdomain`, `conexa_api_key`, `conexa_default_product_id` — retornar 422 com mensagem clara se ausente
2. **Base URL dinâmica**: `https://${settings.conexa_subdomain}.conexa.app/index.php/api/v2`
3. **ensureConexaCustomer**: `POST ${baseUrl}/customer` com `{ name, email, cpfCnpj }`, header `Authorization: Bearer ${apiKey}`. Salvar `conexa_customer_id` no banco
4. **createConexaSale**: `POST ${baseUrl}/sale` com payload:
```json
{
  "customerId": "<conexa_customer_id>",
  "dueDate": "YYYY-MM-DD",
  "products": [{ "productId": <conexa_default_product_id>, "quantity": 1, "unitPrice": <amount> }]
}
```
5. **Response handling**: O `POST /sale` retorna `{ "id": 12345 }` com status `notBilled`. Salvar esse ID como `conexa_charge_id`. Os campos `conexa_invoice_url` e `conexa_pix_copy_paste` ficam `null` por enquanto (o faturamento real no Conexa gera esses dados posteriormente via webhook ou consulta manual). O frontend já lida com `invoice_url` nulo sem quebrar.

