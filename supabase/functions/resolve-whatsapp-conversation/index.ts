import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assertAgencyAccess, HttpError } from "../_shared/auth.ts";
import { resolveLeadConversation, logWebhookEvent } from "../_shared/whatsapp-conversation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { account_id, lead_id, phone_number } = await req.json().catch(() => ({} as any));
    if (!account_id) return json({ success: false, error: "account_id is required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: account, error: accErr } = await supabase
      .from("whatsapp_accounts")
      .select("id, agency_id")
      .eq("id", account_id)
      .maybeSingle();

    if (accErr || !account) return json({ success: false, error: "Account not found" }, 404);

    await assertAgencyAccess(req, supabase, account.agency_id);

    let leadPhone = phone_number ?? null;
    if (!leadPhone && lead_id) {
      const { data: lead } = await supabase
        .from("leads")
        .select("phone")
        .eq("id", lead_id)
        .maybeSingle();
      leadPhone = lead?.phone ?? null;
    }

    if (!leadPhone && !lead_id) {
      return json({ success: false, error: "phone_number or lead_id required" }, 400);
    }

    const conv = await resolveLeadConversation(supabase, {
      accountId: account.id,
      agencyId: account.agency_id,
      leadId: lead_id ?? null,
      phone: leadPhone ?? "",
      context: "lead",
    });

    if (conv.created || conv.linked) {
      await logWebhookEvent(supabase, {
        account_id: account.id,
        agency_id: account.agency_id,
        lead_id: conv.lead_id,
        conversation_id: conv.id,
        event: "resolve",
        phone_number: conv.phone_number,
        resolved_conversation: true,
        resolved_lead: !!conv.lead_id,
        action_taken: conv.created ? "conversation_created" : "conversation_linked_to_lead",
      });
    }

    return json({
      success: true,
      conversation_id: conv.id,
      lead_id: conv.lead_id,
      phone_number: conv.phone_number,
      remote_jid: conv.remote_jid,
      created: conv.created,
      linked: conv.linked,
    });
  } catch (err) {
    console.error("[resolve-whatsapp-conversation] error", err);
    const status = err instanceof HttpError ? err.status : 500;
    return json({ success: false, error: err instanceof Error ? err.message : String(err) }, status);
  }
});
