# Conexa: Geração automática de boleto via invoicingMethodId

Causa raiz confirmada: o `POST /charge` da Conexa hoje envia apenas `salesIds + dueDate + notes`. Sem `invoicingMethodId`, a Conexa cai no meio de faturamento padrão do cliente — quando esse padrão não é boleto/Efí, a cobrança nasce sem transação. A correção principal é enviar `invoicingMethodId` (tipo `billet`) configurado por agência, e depois enriquecer com `GET /charge/:id` e `GET /charge/pix/:id` para popular boleto e Pix em campos separados.

## Fases

### Fase 1 — Migração de banco

Em `agency_payment_settings` adicionar:
- `conexa_invoicing_method_id integer`
- `conexa_invoicing_method_name text`
- `conexa_invoicing_method_type text`
- `conexa_auto_generate_billet boolean default false`

Em `client_payments` adicionar:
- `conexa_sale_id text`
- `conexa_charge_url text`
- `conexa_billet_url text`
- `conexa_pix_qr_code text`
- `conexa_raw_charge jsonb`
- `conexa_billing_status text`
- `conexa_last_sync_at timestamptz`

Nova tabela `conexa_api_logs` (id, agency_id, payment_id, client_id, operation, endpoint, http_status, success, request_payload jsonb, response_payload jsonb, error_message, created_at) com GRANTs (service_role full, authenticated select da própria agência via RLS) e índice em `(agency_id, created_at desc)`. Retenção via cleanup pg_cron (30 dias).

Campos antigos mantidos por compatibilidade com nova semântica:
- `conexa_sale_id` = ID da venda
- `conexa_charge_id` = ID da cobrança (somente após POST /charge)
- `conexa_charge_url` (novo) e `conexa_invoice_url` (legado) = chargeUrl
- `conexa_billet_url` = billetUrl (NUNCA mais salvar boleto em `conexa_pix_copy_paste`)
- `conexa_pix_copy_paste` = copyPasteCode de `/charge/pix/:id`
- `conexa_pix_qr_code` = qrCode de `/charge/pix/:id`

### Fase 2 — UI ConexaIntegration

Nova seção "Boleto / Meio de Faturamento":
- Botão "Buscar meios de faturamento" → chama edge `conexa-list-invoicing-methods` que faz `GET /invoicingMethods?companyId[]=<conexa_company_id>&type=billet&isActive=1&limit=100`
- Select com `name (type) — id` das opções retornadas
- Toggle "Gerar boleto automaticamente ao faturar"
- Validação: se toggle ativo, `conexa_invoicing_method_id` obrigatório e meio deve ser `type=billet` e `isActive=true`
- Persistir `conexa_invoicing_method_id/_name/_type` e `conexa_auto_generate_billet`

### Fase 3 — Client Conexa compartilhado

`supabase/functions/_shared/conexa-client.ts` com: `conexaRequest`, `listInvoicingMethods`, `validateInvoicingMethod`, `ensureConexaCustomer`, `createConexaSale`, `createConexaCharge`, `getConexaCharge`, `getConexaPix`, `parseConexaChargeUrls`, `sanitizeConexaPayloadForLogs` (remove token/headers sensíveis). Toda chamada grava em `conexa_api_logs`.

### Fase 4 — POST /charge com invoicingMethodId

Em `create-gateway-charge` (branch Conexa) e `invoice-conexa-sale`:
```
chargeBody = { salesIds:[saleId], dueDate, notes }
if (settings.conexa_auto_generate_billet) {
  if (!settings.conexa_invoicing_method_id) → 422 erro claro
  await validateInvoicingMethod(...) → garante type=billet, isActive=true
  chargeBody.invoicingMethodId = settings.conexa_invoicing_method_id
}
```
Erros da Conexa em invoicingMethodId → log + mensagem amigável.

### Fase 5 — Enriquecer pós-cobrança

Após `POST /charge`:
1. salvar `conexa_charge_id`
2. `GET /charge/:id` → `conexa_charge_url`, `conexa_invoice_url`, `conexa_billet_url`, `conexa_raw_charge`
3. `GET /charge/pix/:id` → se retornar, salvar `conexa_pix_copy_paste` e `conexa_pix_qr_code`
4. atualizar `conexa_last_sync_at`

### Fase 6 — Separar sale_id e charge_id

- Após `POST /sale` → gravar em `conexa_sale_id` (não em `conexa_charge_id`)
- Após `POST /charge` → gravar em `conexa_charge_id`
- `invoice-conexa-sale` usa `conexa_sale_id` para faturar venda ainda não faturada
- Migração de dados: backfill best-effort copiando `conexa_charge_id` antigo (quando ainda era sale) para `conexa_sale_id` apenas para registros sem `chargeUrl` (status pré-faturamento). Demais ficam como charge.

### Fase 7 — Status `conexa_billing_status`

Valores: `sale_created`, `charge_created`, `billet_available`, `charge_created_without_billet`, `pix_available` (auxiliar/metadata), `paid`, `cancelled`, `error`. Decisão após `GET /charge/:id`:
- `billetUrl` presente → `billet_available`
- ausente e auto boleto estava ativo → `charge_created_without_billet`
- Pix disponível → registrar flag em metadata sem sobrescrever status principal

### Fase 8 — Logs `conexa_api_logs`

Operações: `invoicing_methods_list`, `invoicing_method_validate`, `customer_create`, `sale_create`, `charge_create`, `charge_fetch`, `pix_fetch`, `charge_reconcile`, `webhook_received`. Payload sanitizado, nunca persistir `Authorization`/token.

### Fase 9 — Cobranças antigas sem boleto

Sem endpoint público para gerar boleto em cobrança já criada:
- Apenas alerta visual nas faturas antigas (`charge_created_without_billet`)
- Não tentar endpoints não documentados
- Documentar para o usuário pedir ao suporte Conexa endpoint oficial, se necessário

### Fase 10 — `reconcile-conexa-payments`

Para cada cobrança pendente: `GET /charge/:id` (atualiza `raw_charge`, `charge_url`, `billet_url`, `last_sync_at`); se sem `pix_copy_paste` tenta `GET /charge/pix/:id`. Mantém lógica atual de detecção de quitação. Não gera boleto em massa.

## Arquivos

Novos:
- `supabase/migrations/<ts>_conexa_billing_v2.sql` (colunas + tabela `conexa_api_logs` + RLS + GRANTs + cleanup cron)
- `supabase/functions/_shared/conexa-client.ts`
- `supabase/functions/conexa-list-invoicing-methods/index.ts` (chamada pela UI)

Editados:
- `supabase/config.toml` (registrar nova edge com `verify_jwt = true`)
- `supabase/functions/create-gateway-charge/index.ts` (branch Conexa)
- `supabase/functions/invoice-conexa-sale/index.ts` (usar sale_id, invoicingMethodId, enriquecer pós-charge)
- `supabase/functions/reconcile-conexa-payments/index.ts` (enriquecimento + pix fetch)
- `supabase/functions/_shared/conexa-payment-update.ts` (preencher novos campos)
- `src/components/settings/ConexaIntegration.tsx` (nova seção)
- `src/integrations/supabase/types.ts` (auto, pós-migração)
- `mem://finance/billing/conexa-webhook-resilience` (atualizar com nova arquitetura)

## Critérios de sucesso

1. Auto boleto ativo → `POST /charge` envia `invoicingMethodId`
2. Cobrança nasce com transação/boleto quando meio é billet/Efí
3. `billetUrl` vem em `GET /charge/:id` e é salvo em `conexa_billet_url`
4. Boleto aparece no DDA do cliente
5. Pix continua disponível via `GET /charge/pix/:id` em campos próprios
6. Boleto e Pix em campos separados (sem mistura)
7. Webhook + reconciliador continuam funcionando
8. Sem cobranças duplicadas
9. Sem meio configurado e auto boleto ativo → bloqueia com 422 e mensagem clara antes de criar venda/cobrança
