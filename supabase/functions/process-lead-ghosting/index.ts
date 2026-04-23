import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ACTIVE_FUNNEL_STATUSES = ['leads', 'novo', 'new', 'em_contato', 'qualified', 'follow_up'];
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const startedAt = Date.now();
  let agenciesScanned = 0;
  let leadsMarkedLost = 0;
  let errors = 0;

  try {
    // Step 1: agencies with ghosting automation enabled
    const { data: agencies, error: agenciesErr } = await supabase
      .from('agencies')
      .select('id, name')
      .eq('whatsapp_auto_ghosting', true);

    if (agenciesErr) throw agenciesErr;

    console.log(`[ghosting] Scanning ${agencies?.length ?? 0} agencies with auto-ghosting enabled`);

    const cutoffIso = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();
    const nowIso = new Date().toISOString();

    const agencyResults = await Promise.allSettled(
      (agencies ?? []).map(async (agency) => {
        agenciesScanned++;
        let agencyMarked = 0;

        // Step 2: fetch eligible automations for this agency.
        // We join through whatsapp_accounts to filter by agency.
        const { data: accounts, error: accountsErr } = await supabase
          .from('whatsapp_accounts')
          .select('id')
          .eq('agency_id', agency.id);

        if (accountsErr) throw accountsErr;
        const accountIds = (accounts ?? []).map((a: any) => a.id);
        if (accountIds.length === 0) return { agencyId: agency.id, marked: 0 };

        const { data: automations, error: autosErr } = await supabase
          .from('whatsapp_automation_control')
          .select('id, lead_id, conversation_id, status, next_execution_at, last_followup_sent_at, current_phase, current_step_position, account_id')
          .in('account_id', accountIds)
          .not('last_followup_sent_at', 'is', null)
          .lt('last_followup_sent_at', cutoffIso);

        if (autosErr) throw autosErr;

        console.log(`[ghosting] Agency ${agency.id}: ${automations?.length ?? 0} candidate automations`);

        // Step 3: per-automation try/catch so a single failure doesn't break the agency loop
        for (const auto of automations ?? []) {
          try {
            // 🔒 Guardrail #2: trust either explicit 'finished' state OR empty/past queue
            const isReadyForGhosting =
              auto.status === 'finished' ||
              !auto.next_execution_at ||
              new Date(auto.next_execution_at) < new Date(nowIso);

            if (!isReadyForGhosting) continue;
            if (!auto.lead_id) continue;

            // Validate no customer reply after last follow-up
            if (auto.conversation_id) {
              const { data: conv } = await supabase
                .from('whatsapp_conversations')
                .select('last_customer_message_at')
                .eq('id', auto.conversation_id)
                .maybeSingle();

              const lastCustomerMsg = conv?.last_customer_message_at
                ? new Date(conv.last_customer_message_at)
                : null;
              const lastFollowup = new Date(auto.last_followup_sent_at);

              if (lastCustomerMsg && lastCustomerMsg > lastFollowup) {
                // Customer responded after our last message — not ghosting
                continue;
              }
            }

            // Validate lead is in active funnel
            const { data: lead } = await supabase
              .from('leads')
              .select('id, status, name')
              .eq('id', auto.lead_id)
              .maybeSingle();

            if (!lead) continue;
            if (!ACTIVE_FUNNEL_STATUSES.includes(lead.status)) continue;

            // Atomic actions: mark lead as lost + history + finalize automation
            const { error: updateErr } = await supabase
              .from('leads')
              .update({
                status: 'lost',
                loss_reason: 'ghosting_whatsapp',
              })
              .eq('id', lead.id);

            if (updateErr) throw updateErr;

            await supabase.from('lead_history').insert({
              lead_id: lead.id,
              agency_id: agency.id,
              action_type: 'auto_ghosting',
              field_name: 'status',
              old_value: lead.status,
              new_value: 'lost',
            });

            await supabase
              .from('whatsapp_automation_control')
              .update({
                status: 'finished',
                conversation_state: 'ghosted',
              })
              .eq('id', auto.id);

            agencyMarked++;
            leadsMarkedLost++;
            console.log(`[ghosting] Lead marked lost: ${lead.id} (${lead.name}) — agency ${agency.id}`);
          } catch (innerErr) {
            errors++;
            console.error(`[ghosting] Failed processing automation ${auto.id}:`, innerErr);
          }
        }

        return { agencyId: agency.id, marked: agencyMarked };
      }),
    );

    // Account for agency-level failures
    for (const r of agencyResults) {
      if (r.status === 'rejected') {
        errors++;
        console.error('[ghosting] Agency-level failure:', r.reason);
      }
    }

    const elapsedMs = Date.now() - startedAt;
    const summary = {
      agencies_scanned: agenciesScanned,
      leads_marked_lost: leadsMarkedLost,
      errors,
      elapsed_ms: elapsedMs,
    };
    console.log('[ghosting] Done', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('[ghosting] Fatal error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message, agencies_scanned: agenciesScanned, leads_marked_lost: leadsMarkedLost, errors: errors + 1 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
