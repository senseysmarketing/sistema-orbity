import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HttpError, assertAgencyAccess } from "../_shared/auth.ts";
import { triggerAutomationFlows } from "../_shared/automation-engine.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({}));
    const agencyId = String(payload.agency_id || '').trim();
    const leadId = String(payload.lead_id || '').trim();
    const triggerType = String(payload.trigger_type || '').trim();

    if (!agencyId || !leadId || !triggerType) {
      return json({
        success: false,
        code: 'missing_fields',
        error: 'agency_id, lead_id and trigger_type are required',
      }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await assertAgencyAccess(req, supabase, agencyId);

    const result = await triggerAutomationFlows(supabase, {
      agencyId,
      leadId,
      triggerType,
      payload: payload.payload || {},
    });

    return json({ success: true, ...result });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : String(err);
    console.error('[automation-trigger] error', err);
    return json({ success: false, error: message }, status);
  }
});
