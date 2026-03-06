

# Eventos Meta por Estágio do Pipeline + Melhorias na Engine de Conversões

## Resumo

Aprimorar a integração Meta Conversions API para:
1. Disparar eventos padrão Meta em cada mudança de status do pipeline CRM
2. Adicionar `event_id` para deduplicação nativa Meta
3. Enviar mais dados hashados (first_name, last_name) para melhor Event Match Quality
4. Enviar `value` nos eventos para Value-Based Optimization
5. Enviar evento `ColdLead` (customizado) para leads frios
6. Garantir que eventos aconteçam no momento correto do pipeline (delay natural)

## Mapeamento de Eventos

| Status CRM | Evento Meta | Tipo |
|---|---|---|
| `leads` (criado) | `Lead` | padrão |
| HOT (scoring) | `QualifiedLead` | custom |
| COLD (scoring) | `ColdLead` | custom |
| `scheduled` | `Schedule` | padrão |
| `proposal` | `SubmitApplication` | padrão |
| `won` | `Purchase` | padrão |

## Alterações

### 1. Migration SQL — Adicionar `event_id` na tabela `meta_conversion_events`

```sql
ALTER TABLE meta_conversion_events ADD COLUMN IF NOT EXISTS event_id text;
-- Manter UNIQUE(lead_id, event_name) existente
```

### 2. Edge Function `process-lead-qualification/index.ts` — Melhorias

- Adicionar `event_id` (`{lead_id}_{event_name}`) no payload Meta
- Hashear `first_name` e `last_name` (extraídos de `lead.name`) além de phone/email
- Enviar `value` no `custom_data` (usar `lead.value` se existir)
- Disparar evento `ColdLead` para leads classificados como COLD
- Salvar `event_id` na tabela `meta_conversion_events`

### 3. Novo: Trigger de eventos Meta no pipeline — `LeadsKanban.tsx`

Quando o lead muda de status no Kanban (drag-and-drop), chamar a edge function para disparar o evento Meta correspondente ao novo status. Adicionar uma chamada após o `supabase.update()` bem-sucedido.

A lógica será:
- `scheduled` → chamar function com evento `Schedule`
- `proposal` → chamar function com evento `SubmitApplication`
- `won` → chamar function com evento `Purchase`

Isso será feito via uma nova chamada à edge function `process-lead-qualification` com um parâmetro extra `pipeline_event` que indica qual evento disparar, OU criar um endpoint dedicado `send-meta-pipeline-event`.

**Decisão: Expandir `process-lead-qualification`** para aceitar um modo `pipeline_event` que recebe `{ lead_id, agency_id, event_name, value? }` e dispara o evento Meta diretamente (sem recalcular score).

### 4. `LeadForm.tsx` — Mesma lógica para edição manual de status

Quando o status é alterado pelo formulário de edição, disparar o evento Meta correspondente.

## Arquivos Afetados

1. **Nova migration SQL** — `event_id` column
2. **`supabase/functions/process-lead-qualification/index.ts`** — event_id, mais hashing, value, ColdLead, modo pipeline_event
3. **`src/components/crm/LeadsKanban.tsx`** — Chamar edge function após mudança de status
4. **`src/components/crm/LeadForm.tsx`** — Chamar edge function após mudança de status manual

