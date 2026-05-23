import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { HttpError, assertOptionalSecret } from "../_shared/auth.ts";
import { incrementFlowMetric, logExecutionEvent, processPendingAction } from "../_shared/automation-engine.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function nextRetryAt(attempts: number) {
  const minutes = attempts <= 1 ? 1 : attempts === 2 ? 5 : 15;
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    assertOptionalSecret(req, 'WHATSAPP_AUTOMATION_WORKER_SECRET');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const limit = Math.min(Number(new URL(req.url).searchParams.get('limit') || 25), 50);
    const { data: due, error } = await supabase
      .from('automation_pending_actions')
      .select('id, attempts')
      .eq('status', 'pending')
      .lte('run_at', new Date().toISOString())
      .order('run_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const summary = { scanned: due?.length || 0, processed: 0, failed: 0, cancelled: 0 };

    for (const item of due || []) {
      const { data: locked, error: lockError } = await supabase
        .from('automation_pending_actions')
        .update({ status: 'processing', locked_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('status', 'pending')
        .select('*')
        .maybeSingle();

      if (lockError) {
        console.error('[automation-worker] lock failed', lockError);
        summary.failed += 1;
        continue;
      }
      if (!locked) {
        summary.cancelled += 1;
        continue;
      }

      try {
        const result = await processPendingAction(supabase, locked);
        if ((result as any)?.cancelled || (result as any)?.stopped) summary.cancelled += 1;
        else summary.processed += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const attempts = Number(locked.attempts || 0) + 1;
        console.error('[automation-worker] action failed', { id: locked.id, attempts, message });

        if (attempts >= 4) {
          await supabase
            .from('automation_pending_actions')
            .update({ status: 'failed', attempts, last_error: message })
            .eq('id', locked.id);

          await supabase
            .from('automation_executions')
            .update({
              status: 'failed',
              last_error: message,
              completed_at: new Date().toISOString(),
              last_activity_at: new Date().toISOString(),
            })
            .eq('id', locked.execution_id);

          await incrementFlowMetric(supabase, locked.flow_id, 'errors');
          await logExecutionEvent(supabase, {
            execution_id: locked.execution_id,
            flow_id: locked.flow_id,
            agency_id: locked.agency_id,
            lead_id: locked.lead_id,
            step_id: locked.step_id,
            event_type: 'send_error',
            message,
            metadata: { attempts },
          });
          summary.failed += 1;
        } else {
          await supabase
            .from('automation_pending_actions')
            .update({
              status: 'pending',
              attempts,
              locked_at: null,
              last_error: message,
              run_at: nextRetryAt(attempts),
            })
            .eq('id', locked.id);
        }
      }
    }

    return json({ success: true, ...summary });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : String(err);
    console.error('[automation-worker] fatal', err);
    return json({ success: false, error: message }, status);
  }
});
