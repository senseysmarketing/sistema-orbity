

# CRM Vivo: transição automática com guardrails de mídia e auditoria limpa

## Onde
`supabase/functions/whatsapp-webhook/index.ts` — bloco `messages.upsert`, dentro do `if (!isFromMe)`.

## Helper `promoteLeadOnReply` (novo)

```ts
const INITIAL_STATUSES = new Set(['leads', 'new', 'novo']);

async function promoteLeadOnReply(
  supabase: any,
  agencyId: string,
  leadId: string
) {
  try {
    // 1) Status atual
    const { data: lead } = await supabase
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .maybeSingle();
    if (!lead) return;

    const currentStatus = (lead.status || '').toString().trim().toLowerCase();
    if (!INITIAL_STATUSES.has(currentStatus)) return; // não retrocede

    // 2) Resolver alvo: 2º status da pipeline da agência
    const { data: statuses } = await supabase
      .from('lead_statuses')
      .select('name, order_position')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('order_position', { ascending: true });

    let target = 'em_contato'; // fallback canônico
    if (statuses && statuses.length >= 2) {
      target = normalizeToCanonical(statuses[1].name);
    }

    // 3) UPDATE + nota complementar (sem duplicar trigger)
    await Promise.all([
      supabase.from('leads').update({ status: target }).eq('id', leadId),
      supabase.from('lead_history').insert({
        lead_id: leadId,
        agency_id: agencyId,
        action_type: 'whatsapp_interaction',
        description: 'Lead interagiu no WhatsApp. O cartão foi movido automaticamente para a próxima etapa.',
      }),
    ]);
  } catch (e) {
    console.error('[whatsapp-webhook] promoteLeadOnReply error:', e);
  }
}
```

`normalizeToCanonical()` = versão inline do mapa de `src/lib/crm/leadStatus.ts` (Deno não importa de `src/`).

## Chamada no handler (com guardrail de mídia)

Logo após o bloco de pausa de automações:

```ts
const hasText = content && content.trim().length > 0;
const hasMedia = !!(
  msg.message?.audioMessage ||
  msg.message?.imageMessage ||
  msg.message?.videoMessage ||
  msg.message?.documentMessage ||
  msg.message?.stickerMessage
);

if (conversation.lead_id && (hasText || hasMedia)) {
  await promoteLeadOnReply(supabase, account.agency_id, conversation.lead_id);
}
```

Executado em paralelo com a pausa de automações via `Promise.all([pauseAutomations(...), promoteLeadOnReply(...)])` para zero latência adicional.

## Guardrails aplicados
| # | Garantia | Implementação |
|---|----------|---------------|
| 1 | Áudio/imagem/vídeo/doc/sticker promovem | `hasText \|\| hasMedia` |
| 2 | Sem duplicidade visual | `action_type='whatsapp_interaction'` (trigger usa `'status_changed'`) |
| 3 | Não retrocede funil | Whitelist `['leads','new','novo']` |
| 4 | Multi-agência | `lead_statuses` filtrado por `agency_id` |
| 5 | Compat custom statuses | 2º por `order_position`, fallback `em_contato` |
| 6 | Performance | `Promise.all` com pausa de automações |
| 7 | Resiliência | try/catch fail-open |

## Ficheiro alterado
- `supabase/functions/whatsapp-webhook/index.ts`

Sem migration. Sem schema change.

