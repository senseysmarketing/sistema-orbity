

# Importação 2.0 — Plano Final com Guardrails de Reconciliação

## Resumo

Refator do módulo de importação para um **Wizard de 5 etapas** focado em `clients_and_payments`, com Smart Mapping, Dry-Run editável, sincronização opcional com gateways de pagamento e processamento server-side via Edge Function com progresso em tempo real. Tipos `expenses/salaries/leads` mantêm o fluxo atual sem regressão.

**4 Guardrails incorporados**: idempotência tripla (DB local → gateway_id local → lookup por documento no gateway), contratos implícitos para MRR, batch upsert em chunks de 50, e badge de auto-detecção 100%.

## 1. Migração SQL — `import_jobs`

```sql
CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  total_rows int NOT NULL,
  processed_rows int NOT NULL DEFAULT 0,
  success_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  gateway_synced_count int NOT NULL DEFAULT 0,
  gateway_skipped_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  errors jsonb DEFAULT '[]'::jsonb,
  sync_gateway boolean DEFAULT false,
  add_to_mrr boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency members select own jobs" ON public.import_jobs
  FOR SELECT USING (user_belongs_to_agency(agency_id));
CREATE POLICY "agency admins insert jobs" ON public.import_jobs
  FOR INSERT WITH CHECK (is_agency_admin(agency_id));
-- UPDATE apenas via service role (sem policy pública).

ALTER PUBLICATION supabase_realtime ADD TABLE public.import_jobs;
```

## 2. Templates & Validators

**`src/lib/import/templateGenerator.ts`** — aba **Clientes** com colunas: Nome, Email, Telefone, CPF/CNPJ, Status (`LEAD`/`ATIVO`), Mensalidade, Dia de Vencimento.

**`src/lib/import/validators.ts`** — `ClientImportSchema` v2 com `superRefine`:
- Status `ATIVO` → `monthly_fee > 0` e `due_day` ∈ [1..31] **obrigatórios** (Guardrail 2 client-side).
- Status `LEAD` → `monthly_fee` e `due_day` ignorados.
- `document` opcional; se preenchido, validar 11 ou 14 dígitos.
- `email` opcional; se preenchido, validar formato.

## 3. Wizard — `src/pages/Import.tsx`

5 etapas para `clients_and_payments`:
```
[1 Tipo] → [2 Upload] → [3 Mapping & Dry-Run] → [4 Sync Options] → [5 Processando]
```

Indicador visual estilo Quiet Luxury (círculos numerados, linhas finas). Tipos `expenses/salaries/leads` permanecem no fluxo atual.

## 4. Smart Mapping — `SmartMappingPreview.tsx` (novo)

- **`src/lib/import/columnMapper.ts`** (novo): auto-detecção por sinônimos normalizados (acentos/case) — `contato/whatsapp→telefone`, `cpf/cnpj/documento→document`, `valor/mensalidade→monthly_fee`, etc.
- Tabela `Coluna do Arquivo → Campo do Sistema` com `Select` por coluna.
- **Guardrail 4**: se 100% das colunas obrigatórias forem detectadas + zero erros → toast `"Colunas detectadas automaticamente"` + badge verde **"Auto-detectado"** no header.
- 3 cards de resumo: **Válidas** / **Erros** / **Avisos**.
- Tabela editável inline: célula vermelha → clique → `Input` → re-valida em tempo real.
- Botão "Avançar" desabilitado enquanto `errors > 0`.

## 5. Sync Options — `SyncOptionsStep.tsx` (novo)

Card único com 2 toggles `Switch`:

| Toggle | Comportamento |
|---|---|
| **Sincronizar com Gateway de Pagamento** | Lê `payment_gateway_configs`; desabilita se nenhum ativo. Aviso amarelo se houver ATIVOS sem CPF/CNPJ. |
| **Adicionar ao MRR** | Marca clientes `ATIVO` como `active=true` para entrarem nos cálculos de MRR. |

Botão final → **"Iniciar Importação"**.

## 6. Edge Function — `process-batch-import` (nova)

### Contrato
```
POST /process-batch-import
Body: { agency_id, rows[], sync_gateway, add_to_mrr, job_id }
```

### Fluxo
1. **Auth**: `getClaims` + `is_agency_admin(agency_id)`.
2. **Validar body** com Zod.
3. Carregar `payment_gateway_configs` ativo (se `sync_gateway`).
4. **Pré-fetch idempotência** (Guardrail 1): `SELECT id, name, document, asaas_customer_id, conexa_customer_id, monthly_fee FROM clients WHERE agency_id=$1` → mapas em memória por `document` e por `name_normalized`.
5. **Batch upsert clients** (Guardrail 3) em chunks de 50:
   - Match por `document` (prioridade) ou `name_normalized` (fallback).
   - Status=ATIVO + `add_to_mrr` → `active=true, monthly_fee, due_day`.
   - Status=LEAD → `active=false, monthly_fee=null`.
   - `upsert` em bloco (single round-trip por chunk).
6. **Sync Gateway** (Guardrail 1 — idempotência estrita):
   ```
   Para cada cliente ATIVO no chunk:
     se já tem asaas_customer_id/conexa_customer_id local → skip (skipped++)
     senão se tem document:
        GET no gateway por documento (Asaas /customers?cpfCnpj= | Conexa /customer?document=)
        se encontrado → salvar id local (skipped++)
        senão → POST create + salvar id (synced++)
     senão (sem document) → skip + warning em errors[]
   ```
   - `try/catch` por chamada; falha em 1 não aborta o lote.
   - Reaproveita `ensureAsaasCustomer` / payload Conexa já estabelecidos.
7. **Update progresso** em `import_jobs` por chunk (não por linha).
8. Final: `status='done'`, retorna sumário.

### Comentário-guarda (Guardrail 3)
```ts
// IMPORTANT: Inserts run in chunks of 50 to avoid:
// - Trigger cascade timeouts (notify_*, lead history, etc.)
// - DB connection exhaustion under load
// - Webhook event loops (clients table may have downstream listeners)
// Do NOT switch to row-by-row inserts.
const CHUNK_SIZE = 50;
```

### Config
- `supabase/config.toml`: `[functions.process-batch-import] verify_jwt = false` (auth manual no código, padrão do projeto).
- CORS headers Supabase completos (`x-client-info`, `apikey`, etc.).

## 7. Tela de Progresso — `ImportProgressStep.tsx` (novo)

- `<Progress>` shadcn com `processed_rows/total_rows`.
- 5 contadores: **Total | Sucesso | Erros | Sincronizados | Já existiam no Gateway**.
- Realtime: `supabase.channel('import_job:'+jobId).on('postgres_changes', filter: id=eq.<jobId>)`. Fallback: polling 1s (Fail-Open).
- `status==='done'` → renderiza `ImportResults` expandido com seção "Sincronização com Gateway".

## Fluxo "Senseys" (idempotência em ação)

1. **1ª subida**: 100 clientes criados, 80 ATIVOS sincronizados no Asaas.
2. **Mesma planilha de novo**: "100 já existem (matched por document), 80 já existem no Asaas (matched por id local)". **Zero duplicações.**
3. **+5 novos clientes na planilha**: "100 já existem, 5 criados, 4 sincronizados no Asaas".
4. **Aba Comando** → MRR atualiza com os novos contratos.

## Garantias

| # | Garantia |
|---|---|
| 1 | Idempotência tripla: DB local (document/name) → gateway_id local → lookup por documento no gateway. |
| 2 | Status=ATIVO sem mensalidade/due_day bloqueado no front e re-validado no servidor. |
| 3 | Chunks de 50 protegem triggers e webhooks de cascata; comentário-guarda no código. |
| 4 | Auto-detect 100% → badge + toast discreto. |
| 5 | Falha de 1 linha não aborta o lote — erros agregados em `import_jobs.errors`. |
| 6 | Realtime de progresso com fallback de polling. |
| 7 | RLS: só admins disparam; membros visualizam jobs da agência. |

## Ficheiros

**Migration**: `import_jobs` + RLS + realtime publication.

**Edge Function**:
- `supabase/functions/process-batch-import/index.ts` (novo)
- `supabase/config.toml` — entry `verify_jwt = false`

**Novos**:
- `src/components/import/SmartMappingPreview.tsx`
- `src/components/import/SyncOptionsStep.tsx`
- `src/components/import/ImportProgressStep.tsx`
- `src/lib/import/columnMapper.ts`

**Alterados**:
- `src/lib/import/templateGenerator.ts` — colunas Email/Document/Status/Mensalidade/Dia.
- `src/lib/import/validators.ts` — `ClientImportSchema` v2 condicional.
- `src/lib/import/excelParser.ts` — parser das novas colunas.
- `src/pages/Import.tsx` — wizard 5 etapas para `clients_and_payments`.
- `src/components/import/ImportResults.tsx` — contadores de gateway sync/skip.

