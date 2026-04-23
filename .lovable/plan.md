

# Módulo de Automações Inteligentes do CRM — Plano Final (com Guardrails)

## Passo 1 — Migration (schema)

```sql
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS whatsapp_auto_contact BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_auto_ghosting BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_agencies_auto_ghosting
  ON public.agencies(id) WHERE whatsapp_auto_ghosting = true;
```

## Passo 2 — UI: nova seção "Automações do CRM" em `WhatsAppIntegration.tsx`

Adicionar bloco entre os cards de instância e o botão "Sincronizar conversas com leads", padrão visual `p-4 border rounded-lg bg-muted/20` (mesmo do toggle de billing existente):

- **Auto-Contato** (`whatsapp_auto_contact`, default `true`)
  - Label: *"Mover lead para Contato ao receber resposta"*
  - Descrição: *"Quando o lead enviar a primeira mensagem, ele é movido automaticamente da coluna inicial para Em Contato."*
- **Auto-Ghosting** (`whatsapp_auto_ghosting`, default `false`)
  - Label: *"Mover para Perdido 24h após o último Follow-up"*
  - Descrição: *"Se o lead não responder até 24 horas após o envio da última mensagem programada da sequência de follow-up, o sistema irá movê-lo automaticamente para Perdido com o motivo 'Ghosting no WhatsApp'."*

`useQuery` lê `agencies.whatsapp_auto_contact / whatsapp_auto_ghosting`; `useMutation` faz `update().eq('id', currentAgency.id)`. Toast em sucesso/erro, idêntico ao `toggleBilling` já existente.

Em `src/components/crm/LossReasonDialog.tsx`, adicionar `{ value: "ghosting_whatsapp", label: "Ghosting no WhatsApp" }` em uma nova categoria *"Problemas de Comunicação"* dentro de `LOSS_REASONS` (entra automaticamente em `ALL_LOSS_REASONS` via spread).

## Passo 3 — Webhook (`whatsapp-webhook/index.ts`) com **Guardrail #1**

Hoje, o bloco de promoção (~linhas 596-602) chama `promoteLeadOnReply` incondicionalmente. Refator:

```ts
// shouldPromote já calculado antes (lead novo + primeira resposta)
if (shouldPromote) {
  // 🔒 Guardrail #1: query SÓ roda quando há candidato real à promoção
  const { data: agencyCfg } = await supabase
    .from('agencies').select('whatsapp_auto_contact')
    .eq('id', account.agency_id).maybeSingle();
  
  if (agencyCfg?.whatsapp_auto_contact !== false) { // default true
    await promoteLeadOnReply(supabase, account.agency_id, conversation.lead_id);
  }
  // se false → mensagem é registrada normalmente, lead permanece onde está
}
// pause-on-reply continua rodando independentemente
```

Resultado: zero queries extras nas milhares de mensagens recebidas de leads que **não** estão sendo promovidos.

## Passo 4 — Nova Edge Function `process-lead-ghosting` com **Guardrail #2**

**Arquivo:** `supabase/functions/process-lead-ghosting/index.ts` + entrada em `supabase/config.toml` (`verify_jwt = false`).

**Lógica determinística por agência (loop com `Promise.allSettled`):**

1. Buscar agências com `whatsapp_auto_ghosting = true`.
2. Para cada agência, buscar **automações elegíveis** em `whatsapp_automation_control` (via join `whatsapp_accounts.agency_id`):

   ```ts
   // 🔒 Guardrail #2: condição reforçada e resiliente a edição de templates
   .or('status.eq.finished,and(next_execution_at.is.null),and(next_execution_at.lt.<now>)')
   .not('last_followup_sent_at', 'is', null)
   .lt('last_followup_sent_at', new Date(Date.now() - 24*60*60*1000).toISOString())
   ```

   Em pseudo-código mais claro (avaliado por linha em JS):
   ```ts
   const isReadyForGhosting =
     (auto.status === 'finished' || (!auto.next_execution_at || new Date(auto.next_execution_at) < now))
     && auto.last_followup_sent_at != null
     && new Date(auto.last_followup_sent_at) < (now - 24h);
   ```
   
   A subquery de `MAX(step_position)` é usada **apenas como reforço opcional** (não bloqueia): se `status = 'finished'`, já confiamos no estado declarado pela própria fila. Isso protege contra o cenário em que a agência adicionou novos templates depois do envio.

3. Para cada automação elegível (try/catch individual):
   - Validar **ausência de resposta** via `whatsapp_conversations.last_customer_message_at`:
     - `null` → ghosting confirmado.
     - `<= last_followup_sent_at` → ghosting confirmado.
     - Caso contrário → pular (cliente respondeu).
   - Validar status do lead em funil ativo (`leads.status IN ('leads','novo','new','em_contato','qualified','follow_up')`).
   - **Ações atômicas**:
     - `UPDATE leads SET status='lost', loss_reason='ghosting_whatsapp' WHERE id = $leadId` (trigger `set_lead_won_at` cuida de `status_changed_at`).
     - `INSERT INTO lead_history (action_type='auto_ghosting', ...)` para auditoria.
     - `UPDATE whatsapp_automation_control SET status='finished', conversation_state='ghosted'`.

4. Resposta JSON: `{ agencies_scanned, leads_marked_lost, errors }`.

CORS padrão do projeto. Logs `console.log` por etapa.

## Passo 5 — Cron Job com **Guardrail #3** (Segurança)

❌ **Não** vai criar arquivo `.sql` versionado com a anon key.

✅ Em vez disso, ao final da implementação, vou entregar este snippet em **comentário Markdown** para o admin colar manualmente no SQL Editor:

```sql
-- Cole no Supabase SQL Editor (NÃO commitar este script)
select cron.schedule(
  'process-lead-ghosting-hourly',
  '0 * * * *', -- toda hora cheia
  $$
  select net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/process-lead-ghosting',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <COLE_AQUI_A_ANON_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## Arquivos editados/criados

- **Migration**: colunas + índice em `agencies`.
- `src/components/settings/WhatsAppIntegration.tsx` — nova seção "Automações do CRM".
- `src/components/crm/LossReasonDialog.tsx` — categoria "Problemas de Comunicação" + entrada `ghosting_whatsapp`.
- `supabase/functions/whatsapp-webhook/index.ts` — query condicionada a `shouldPromote` (Guardrail #1).
- `supabase/functions/process-lead-ghosting/index.ts` — **novo** (Guardrail #2).
- `supabase/config.toml` — registrar `[functions.process-lead-ghosting]` com `verify_jwt = false`.
- **Snippet Markdown** com SQL do cron (Guardrail #3) — entregue na resposta final, **sem** arquivo versionado.

## Sem mudanças

- `process-whatsapp-queue`, `whatsapp_message_templates`, schema das demais tabelas — preservados.
- Lógica de pause-on-reply, anti-bot shield, takeover do operador — preservadas.
- Demais motivos de perda — preservados.

