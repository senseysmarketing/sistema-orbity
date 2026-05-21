// Cron job: marks leads as "lost" (motivo: Ghosting no WhatsApp) when 24h have
// elapsed since the last automated follow-up without any customer reply.
//
// Trigger source: whatsapp_automation_control.last_followup_sent_at.
// Scope: only agencies with whatsapp_auto_ghosting = true.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const ACTIVE_FUNNEL = new Set(["leads", "new", "novo", "em_contato", "qualified", "follow_up", "scheduled", "meeting", "proposal"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const started = Date.now();
  let agenciesScanned = 0;
  let leadsLost = 0;
  let errors = 0;

  try {
    const { data: agencies } = await supabase
      .from("agencies")
      .select("id")
      .eq("whatsapp_auto_ghosting", true);

    const cutoffIso = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();

    for (const agency of agencies ?? []) {
      agenciesScanned++;

      const { data: accounts } = await supabase
        .from("whatsapp_accounts")
        .select("id")
        .eq("agency_id", agency.id);
      const accountIds = (accounts ?? []).map((a: any) => a.id);
      if (accountIds.length === 0) continue;

      const { data: autos } = await supabase
        .from("whatsapp_automation_control")
        .select("id, lead_id, conversation_id, status, last_followup_sent_at, account_id")
        .in("account_id", accountIds)
        .not("last_followup_sent_at", "is", null)
        .lt("last_followup_sent_at", cutoffIso)
        .not("status", "in", "(finished,responded)");

      for (const auto of autos ?? []) {
        try {
          if (!auto.lead_id) continue;

          // Defense in depth: confirm there is no inbound message after our last send.
          if (auto.conversation_id) {
            const { data: inbound } = await supabase
              .from("whatsapp_messages")
              .select("id, created_at")
              .eq("conversation_id", auto.conversation_id)
              .eq("is_from_me", false)
              .gt("created_at", auto.last_followup_sent_at)
              .limit(1)
              .maybeSingle();
            if (inbound) {
              // Customer replied — pause and skip.
              await supabase
                .from("whatsapp_automation_control")
                .update({ status: "responded", conversation_state: "customer_replied" })
                .eq("id", auto.id);
              continue;
            }
          }

          const { data: lead } = await supabase
            .from("leads")
            .select("id, status, name")
            .eq("id", auto.lead_id)
            .maybeSingle();
          if (!lead) continue;
          const currentStatus = String(lead.status || "").toLowerCase();
          if (currentStatus === "won" || currentStatus === "lost") continue;
          if (!ACTIVE_FUNNEL.has(currentStatus)) continue;

          await supabase
            .from("leads")
            .update({
              status: "lost",
              loss_reason: "Ghosting no WhatsApp",
              status_changed_at: new Date().toISOString(),
            })
            .eq("id", lead.id);

          await supabase.from("lead_history").insert({
            lead_id: lead.id,
            agency_id: agency.id,
            user_id: null,
            action_type: "auto_ghosting",
            field_name: "status",
            old_value: lead.status,
            new_value: "lost",
            description: "Lead movido para Perdido automaticamente (Ghosting no WhatsApp - 24h sem resposta).",
          });

          await supabase
            .from("whatsapp_automation_control")
            .update({
              status: "finished",
              conversation_state: "moved_to_lost_ghosting",
            })
            .eq("id", auto.id);

          await supabase.from("whatsapp_automation_logs").insert({
            automation_id: auto.id,
            account_id: auto.account_id,
            event: "ghosting_moved_to_lost",
            details: { lead_id: lead.id, hours_since_last_followup: 24 },
          });

          await supabase.from("whatsapp_webhook_logs").insert({
            account_id: auto.account_id,
            agency_id: agency.id,
            lead_id: lead.id,
            conversation_id: auto.conversation_id,
            event: "ghosting",
            action_taken: "ghosting_moved_to_lost",
          });

          leadsLost++;
        } catch (e) {
          errors++;
          console.error("[ghosting] automation error", auto.id, e);
        }
      }
    }

    const summary = {
      success: true,
      agencies_scanned: agenciesScanned,
      leads_marked_lost: leadsLost,
      errors,
      elapsed_ms: Date.now() - started,
    };
    console.log("[ghosting] done", summary);
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[ghosting] fatal", err);
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
