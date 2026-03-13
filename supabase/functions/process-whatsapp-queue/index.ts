import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MIN_INTERVAL_MS = 120_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [30_000, 120_000, 300_000]; // 30s, 2min, 5min
const RATE_LIMIT_DELAY_MS = 1_000; // 1s between sends

interface SendingSchedule {
  enabled: boolean;
  start_hour: number;
  end_hour: number;
  allowed_days: number[];
}

function toSaoPaulo(date: Date): { hour: number; dayOfWeek: number; dateObj: Date } {
  const spStr = date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  const sp = new Date(spStr);
  return { hour: sp.getHours(), dayOfWeek: sp.getDay(), dateObj: sp };
}

function getNextAllowedTime(schedule: SendingSchedule, baseTime: Date): Date {
  if (!schedule.enabled || schedule.allowed_days.length === 0) return baseTime;

  const { hour, dayOfWeek, dateObj } = toSaoPaulo(baseTime);
  const isDayAllowed = schedule.allowed_days.includes(dayOfWeek);
  const isHourAllowed = hour >= schedule.start_hour && hour < schedule.end_hour;

  if (isDayAllowed && isHourAllowed) return baseTime;

  const utcNow = baseTime.getTime();
  const spNow = dateObj.getTime();
  let candidate = new Date(dateObj);

  if (isDayAllowed && hour < schedule.start_hour) {
    candidate.setHours(schedule.start_hour, 0, 0, 0);
  } else {
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(schedule.start_hour, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      if (schedule.allowed_days.includes(candidate.getDay())) break;
      candidate.setDate(candidate.getDate() + 1);
    }
  }

  const spDiffMs = candidate.getTime() - spNow;
  return new Date(utcNow + spDiffMs);
}

async function logAutomationEvent(
  supabase: any,
  automationId: string | null,
  accountId: string | null,
  event: string,
  details: Record<string, any> = {}
) {
  try {
    await supabase.from('whatsapp_automation_logs').insert({
      automation_id: automationId,
      account_id: accountId,
      event,
      details,
    });
  } catch (e) {
    console.error('[process-queue] Failed to write log:', e);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: pendingAutomations, error: fetchError } = await supabase
      .from('whatsapp_automation_control')
      .select(`
        *,
        whatsapp_accounts!inner(id, agency_id, api_url, api_key, instance_name, status, sending_schedule, allowed_sources),
        whatsapp_conversations(id, phone_number, last_customer_message_at)
      `)
      .eq('status', 'active')
      .lte('next_execution_at', new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;

    if (!pendingAutomations || pendingAutomations.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;

    for (const record of pendingAutomations) {
      try {
        // --- MAX RETRIES CHECK ---
        if ((record.retry_count || 0) >= MAX_RETRIES) {
          await supabase.from('whatsapp_automation_control').update({
            status: 'finished',
            conversation_state: 'max_retries_exceeded',
            last_error: `Exceeded max retries (${MAX_RETRIES})`,
          }).eq('id', record.id);

          await logAutomationEvent(supabase, record.id, record.whatsapp_accounts?.id, 'max_retries_exceeded', {
            retry_count: record.retry_count,
            lead_id: record.lead_id,
          });
          continue;
        }

        // Optimistic lock
        const { data: locked } = await supabase
          .from('whatsapp_automation_control')
          .update({ status: 'processing' })
          .eq('id', record.id)
          .eq('status', 'active')
          .select()
          .maybeSingle();

        if (!locked) continue;

        // Anti-loop protection
        if (record.last_followup_sent_at) {
          const lastSent = new Date(record.last_followup_sent_at).getTime();
          if (Date.now() - lastSent < MIN_INTERVAL_MS) {
            await supabase.from('whatsapp_automation_control').update({ status: 'active' }).eq('id', record.id);
            continue;
          }
        }

        // Check if customer replied.
        // Primary check: the conversation linked to this automation.
        // Fallback check: any OTHER conversation for this lead that has a reply
        //   (handles the case where conversations were duplicated due to phone format mismatch).
        const conv = Array.isArray(record.whatsapp_conversations)
          ? record.whatsapp_conversations[0]
          : record.whatsapp_conversations;

        let replyConv: { id: string; last_customer_message_at: string } | null = null;

        if (conv?.last_customer_message_at) {
          replyConv = conv as { id: string; last_customer_message_at: string };
        } else if (record.lead_id) {
          // Fallback: check any conversation for this lead with a customer reply.
          // This catches the case where the webhook created a separate conversation
          // (due to phone format mismatch) and stored the reply there instead.
          const { data: altConv } = await supabase
            .from('whatsapp_conversations')
            .select('id, last_customer_message_at')
            .eq('account_id', record.whatsapp_accounts?.id)
            .eq('lead_id', record.lead_id)
            .not('last_customer_message_at', 'is', null)
            .order('last_customer_message_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (altConv?.last_customer_message_at) {
            replyConv = altConv as { id: string; last_customer_message_at: string };
          }
        }

        if (replyConv) {
          const customerReplyTime = new Date(replyConv.last_customer_message_at).getTime();
          // Use last_followup_sent_at as reference if available, otherwise use started_at/updated_at.
          // This ensures replies during the greeting phase (before any follow-up is sent) are detected.
          const referenceTime = record.last_followup_sent_at
            ? new Date(record.last_followup_sent_at).getTime()
            : new Date(record.started_at || record.updated_at).getTime();

          if (customerReplyTime > referenceTime) {
            // Also fix conversation_id if it was pointing to the wrong conversation
            const updates: Record<string, any> = {
              status: 'responded',
              conversation_state: 'customer_replied',
            };
            if (replyConv.id !== conv?.id) {
              updates.conversation_id = replyConv.id;
            }

            await supabase.from('whatsapp_automation_control').update(updates).eq('id', record.id);

            await logAutomationEvent(supabase, record.id, record.whatsapp_accounts?.id, 'customer_replied', {
              lead_id: record.lead_id,
              via_fallback: replyConv.id !== conv?.id,
            });
            continue;
          }
        }

        const account = record.whatsapp_accounts;
        if (account.status !== 'connected') {
          await supabase.from('whatsapp_automation_control').update({ status: 'active' }).eq('id', record.id);
          continue;
        }

        // --- SENDING SCHEDULE CHECK ---
        const schedule = account.sending_schedule as SendingSchedule | null;
        if (schedule?.enabled) {
          const now = new Date();
          const nextAllowed = getNextAllowedTime(schedule, now);
          if (nextAllowed.getTime() > now.getTime() + 60_000) {
            await supabase.from('whatsapp_automation_control').update({
              status: 'active',
              next_execution_at: nextAllowed.toISOString(),
            }).eq('id', record.id);
            console.log('[process-queue] Outside schedule, rescheduled to:', nextAllowed.toISOString(), record.id);
            continue;
          }
        }

        // --- ALLOWED SOURCES CHECK ---
        const allowedSources = (account.allowed_sources as string[] | null) || [];
        if (allowedSources.length > 0 && record.lead_id) {
          const { data: leadData } = await supabase
            .from('leads')
            .select('source')
            .eq('id', record.lead_id)
            .maybeSingle();
          
          if (leadData?.source && !allowedSources.includes(leadData.source)) {
            await supabase.from('whatsapp_automation_control').update({
              status: 'finished',
              conversation_state: 'source_not_allowed',
            }).eq('id', record.id);

            await logAutomationEvent(supabase, record.id, account.id, 'source_not_allowed', {
              source: leadData.source, lead_id: record.lead_id,
            });
            continue;
          }
        }

        // Get current step template
        const { data: template } = await supabase
          .from('whatsapp_message_templates')
          .select('*')
          .eq('agency_id', account.agency_id)
          .eq('phase', record.current_phase)
          .eq('step_position', record.current_step_position)
          .eq('is_active', true)
          .maybeSingle();

        if (!template) {
          const finishState = record.current_phase === 'followup' ? 'closed_no_reply' : 'automation_finished';
          await supabase.from('whatsapp_automation_control').update({
            status: 'finished',
            conversation_state: finishState,
          }).eq('id', record.id);

          await logAutomationEvent(supabase, record.id, account.id, 'automation_finished', {
            reason: 'no_template', phase: record.current_phase, step: record.current_step_position,
          });
          continue;
        }

        // Get lead data
        const { data: lead } = await supabase
          .from('leads')
          .select('name, email, phone, company, custom_fields')
          .eq('id', record.lead_id)
          .maybeSingle();

        let message = template.message_template;
        if (lead) {
          message = message
            .replace(/\{\{nome\}\}/gi, lead.name || '')
            .replace(/\{\{email\}\}/gi, lead.email || '')
            .replace(/\{\{telefone\}\}/gi, lead.phone || '')
            .replace(/\{\{empresa\}\}/gi, lead.company || '');

          const customFields = (lead.custom_fields as Record<string, string> | null) || {};
          message = message.replace(/\{\{formulario:([^}]+)\}\}/gi, (_match, fieldKey: string) => {
            const key = fieldKey.trim();
            if (customFields[key] !== undefined && customFields[key] !== null) {
              return String(customFields[key]);
            }
            const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
            for (const [k, v] of Object.entries(customFields)) {
              if (k.toLowerCase().replace(/\s+/g, '_') === normalizedKey && v !== undefined && v !== null) {
                return String(v);
              }
            }
            return '';
          });
        }

        const phoneNumber = conv?.phone_number || lead?.phone;
        if (!phoneNumber) {
          await supabase.from('whatsapp_automation_control').update({ status: 'active' }).eq('id', record.id);
          continue;
        }

        // --- RATE LIMIT: 1s delay between sends ---
        await sleep(RATE_LIMIT_DELAY_MS);

        const sendRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseKey}` },
          body: JSON.stringify({
            account_id: account.id, phone_number: phoneNumber, message,
            conversation_id: conv?.id, lead_id: record.lead_id,
          }),
        });

        const sendResult = await sendRes.json();
        if (!sendResult.success) {
          // --- RETRY LOGIC WITH BACKOFF ---
          const newRetryCount = (record.retry_count || 0) + 1;
          const backoffMs = RETRY_DELAYS_MS[Math.min(newRetryCount - 1, RETRY_DELAYS_MS.length - 1)];
          const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

          await supabase.from('whatsapp_automation_control').update({
            status: newRetryCount >= MAX_RETRIES ? 'finished' : 'active',
            retry_count: newRetryCount,
            last_error: sendResult.error || 'Send failed',
            next_execution_at: newRetryCount >= MAX_RETRIES ? null : nextRetryAt,
            conversation_state: newRetryCount >= MAX_RETRIES ? 'max_retries_exceeded' : record.conversation_state,
          }).eq('id', record.id);

          await logAutomationEvent(supabase, record.id, account.id, 'send_failed', {
            retry_count: newRetryCount, error: sendResult.error, next_retry_at: nextRetryAt,
            lead_id: record.lead_id, phase: record.current_phase, step: record.current_step_position,
          });

          console.error('[process-queue] Send failed, retry', newRetryCount, '/', MAX_RETRIES, record.id);
          continue;
        }

        // --- SUCCESS: Reset retry counter ---
        // Determine next step
        const nextStepPosition = record.current_step_position + 1;
        const { data: nextTemplate } = await supabase
          .from('whatsapp_message_templates')
          .select('delay_minutes')
          .eq('agency_id', account.agency_id)
          .eq('phase', record.current_phase)
          .eq('step_position', nextStepPosition)
          .eq('is_active', true)
          .maybeSingle();

        let newPhase = record.current_phase;
        let newStep = nextStepPosition;
        let newState = record.conversation_state;
        let nextExecution: string | null = null;

        if (nextTemplate) {
          const baseTime = new Date(Date.now() + nextTemplate.delay_minutes * 60 * 1000);
          const adjustedTime = schedule?.enabled ? getNextAllowedTime(schedule, baseTime) : baseTime;
          nextExecution = adjustedTime.toISOString();
          newState = `${record.current_phase}_${record.current_step_position}_sent`;
        } else if (record.current_phase === 'greeting') {
          const { data: followupTemplate } = await supabase
            .from('whatsapp_message_templates')
            .select('delay_minutes')
            .eq('agency_id', account.agency_id)
            .eq('phase', 'followup')
            .eq('step_position', 1)
            .eq('is_active', true)
            .maybeSingle();

          if (followupTemplate) {
            newPhase = 'followup';
            newStep = 1;
            const baseTime = new Date(Date.now() + followupTemplate.delay_minutes * 60 * 1000);
            const adjustedTime = schedule?.enabled ? getNextAllowedTime(schedule, baseTime) : baseTime;
            nextExecution = adjustedTime.toISOString();
            newState = 'waiting_reply';
          } else {
            newState = 'automation_finished';
          }
        } else {
          newState = 'closed_no_reply';
        }

        await supabase.from('whatsapp_automation_control').update({
          status: nextExecution ? 'active' : 'finished',
          current_phase: newPhase,
          current_step_position: newStep,
          next_execution_at: nextExecution,
          last_followup_sent_at: new Date().toISOString(),
          conversation_state: newState,
          conversation_id: sendResult.conversation_id || conv?.id,
          retry_count: 0, // Reset on success
          last_error: null,
        }).eq('id', record.id);

        await logAutomationEvent(supabase, record.id, account.id, 'step_executed', {
          lead_id: record.lead_id, phase: record.current_phase, step: record.current_step_position,
          next_phase: newPhase, next_step: newStep, next_execution_at: nextExecution,
          conversation_state: newState,
        });

        console.log('[process-queue] STEP_EXECUTED', {
          automation_id: record.id, lead_id: record.lead_id,
          phase: record.current_phase, step: record.current_step_position,
          next_phase: newPhase, next_step: newStep,
          next_execution_at: nextExecution, conversation_state: newState,
        });

        processed++;
      } catch (recordError) {
        console.error('[process-queue] Error processing record:', record.id, recordError);
        
        // Increment retry on unexpected errors too
        const newRetryCount = (record.retry_count || 0) + 1;
        await supabase.from('whatsapp_automation_control').update({
          status: newRetryCount >= MAX_RETRIES ? 'finished' : 'active',
          retry_count: newRetryCount,
          last_error: recordError?.message || 'Unexpected error',
          conversation_state: newRetryCount >= MAX_RETRIES ? 'max_retries_exceeded' : undefined,
        }).eq('id', record.id);

        await logAutomationEvent(supabase, record.id, record.whatsapp_accounts?.id, 'processing_error', {
          error: recordError?.message, retry_count: newRetryCount,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, processed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[process-queue] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
