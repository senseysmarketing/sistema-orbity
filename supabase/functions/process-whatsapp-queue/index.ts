import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MIN_INTERVAL_MS = 120_000;

interface SendingSchedule {
  enabled: boolean;
  start_hour: number;
  end_hour: number;
  allowed_days: number[]; // 0=Sun..6=Sat
}

/**
 * Convert a UTC Date to São Paulo local components
 */
function toSaoPaulo(date: Date): { hour: number; dayOfWeek: number; dateObj: Date } {
  const spStr = date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
  const sp = new Date(spStr);
  return { hour: sp.getHours(), dayOfWeek: sp.getDay(), dateObj: sp };
}

/**
 * Get the next allowed time based on the sending schedule.
 * Returns the original baseTime if within the allowed window, or the next valid start_hour.
 */
function getNextAllowedTime(schedule: SendingSchedule, baseTime: Date): Date {
  if (!schedule.enabled || schedule.allowed_days.length === 0) return baseTime;

  const { hour, dayOfWeek, dateObj } = toSaoPaulo(baseTime);

  // Check if current time is within allowed window
  const isDayAllowed = schedule.allowed_days.includes(dayOfWeek);
  const isHourAllowed = hour >= schedule.start_hour && hour < schedule.end_hour;

  if (isDayAllowed && isHourAllowed) {
    return baseTime;
  }

  // Calculate offset from UTC to SP in ms
  const utcNow = baseTime.getTime();
  const spNow = dateObj.getTime();
  // We need to find the next allowed slot
  // Start from current SP time and advance
  let candidate = new Date(dateObj);

  // If today is allowed but we're before start_hour
  if (isDayAllowed && hour < schedule.start_hour) {
    candidate.setHours(schedule.start_hour, 0, 0, 0);
  } else {
    // Move to next day and find allowed day
    candidate.setDate(candidate.getDate() + 1);
    candidate.setHours(schedule.start_hour, 0, 0, 0);

    // Find next allowed day (up to 7 days ahead)
    for (let i = 0; i < 7; i++) {
      if (schedule.allowed_days.includes(candidate.getDay())) break;
      candidate.setDate(candidate.getDate() + 1);
    }
  }

  // Convert back: calculate the difference in SP time and apply to UTC
  const spDiffMs = candidate.getTime() - spNow;
  return new Date(utcNow + spDiffMs);
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

        // Check if customer replied
        const conv = Array.isArray(record.whatsapp_conversations)
          ? record.whatsapp_conversations[0]
          : record.whatsapp_conversations;

        if (conv?.last_customer_message_at && record.last_followup_sent_at) {
          const customerReplyTime = new Date(conv.last_customer_message_at).getTime();
          const lastFollowup = new Date(record.last_followup_sent_at).getTime();
          if (customerReplyTime > lastFollowup) {
            await supabase.from('whatsapp_automation_control').update({
              status: 'responded', conversation_state: 'customer_replied',
            }).eq('id', record.id);
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
            // Outside allowed window — reschedule
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
            console.log('[process-queue] Source not allowed:', leadData.source, record.id);
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
          await supabase.from('whatsapp_automation_control').update({
            status: 'finished',
            conversation_state: record.current_phase === 'followup' ? 'closed_no_reply' : 'automation_finished',
          }).eq('id', record.id);
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

          // Replace dynamic form variables {{formulario:field_name}}
          const customFields = (lead.custom_fields as Record<string, string> | null) || {};
          message = message.replace(/\{\{formulario:([^}]+)\}\}/gi, (_match, fieldKey: string) => {
            const key = fieldKey.trim();
            if (customFields[key] !== undefined && customFields[key] !== null) {
              return String(customFields[key]);
            }
            // Try formatted key (replace spaces/special chars with underscores)
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
          await supabase.from('whatsapp_automation_control').update({ status: 'active' }).eq('id', record.id);
          continue;
        }

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
        }).eq('id', record.id);

        console.log('[process-queue] STEP_EXECUTED', {
          automation_id: record.id, lead_id: record.lead_id,
          phase: record.current_phase, step: record.current_step_position,
          next_phase: newPhase, next_step: newStep,
          next_execution_at: nextExecution, conversation_state: newState,
        });

        processed++;
      } catch (recordError) {
        console.error('[process-queue] Error processing record:', record.id, recordError);
        await supabase.from('whatsapp_automation_control').update({ status: 'active' }).eq('id', record.id);
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
