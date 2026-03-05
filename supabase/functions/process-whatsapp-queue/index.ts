import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MIN_INTERVAL_MS = 120_000; // 120 seconds anti-loop

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get pending automations
    const { data: pendingAutomations, error: fetchError } = await supabase
      .from('whatsapp_automation_control')
      .select(`
        *,
        whatsapp_accounts!inner(id, agency_id, api_url, api_key, instance_name, status),
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

        if (!locked) {
          console.log('[process-queue] Skipped (already locked):', record.id);
          continue;
        }

        // Anti-loop protection
        if (record.last_followup_sent_at) {
          const lastSent = new Date(record.last_followup_sent_at).getTime();
          if (Date.now() - lastSent < MIN_INTERVAL_MS) {
            console.log('[process-queue] Skipped (anti-loop):', record.id);
            await supabase
              .from('whatsapp_automation_control')
              .update({ status: 'active' })
              .eq('id', record.id);
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
            await supabase
              .from('whatsapp_automation_control')
              .update({
                status: 'responded',
                conversation_state: 'customer_replied',
              })
              .eq('id', record.id);

            console.log('[process-queue] Customer replied, stopping automation:', record.id);
            continue;
          }
        }

        const account = record.whatsapp_accounts;
        if (account.status !== 'connected') {
          await supabase
            .from('whatsapp_automation_control')
            .update({ status: 'active' })
            .eq('id', record.id);
          continue;
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
          // No more steps, finish automation
          await supabase
            .from('whatsapp_automation_control')
            .update({
              status: 'finished',
              conversation_state: record.current_phase === 'followup' ? 'closed_no_reply' : 'automation_finished',
            })
            .eq('id', record.id);

          console.log('[process-queue] No template found, finishing:', record.id);
          continue;
        }

        // Get lead data for template variables
        const { data: lead } = await supabase
          .from('leads')
          .select('name, email, phone, company')
          .eq('id', record.lead_id)
          .maybeSingle();

        // Replace template variables
        let message = template.message_template;
        if (lead) {
          message = message
            .replace(/\{\{nome\}\}/gi, lead.name || '')
            .replace(/\{\{email\}\}/gi, lead.email || '')
            .replace(/\{\{telefone\}\}/gi, lead.phone || '')
            .replace(/\{\{empresa\}\}/gi, lead.company || '');
        }

        // Send message
        const phoneNumber = conv?.phone_number || lead?.phone;
        if (!phoneNumber) {
          console.log('[process-queue] No phone number:', record.id);
          await supabase
            .from('whatsapp_automation_control')
            .update({ status: 'active' })
            .eq('id', record.id);
          continue;
        }

        const sendRes = await fetch(`${supabaseUrl}/functions/v1/whatsapp-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            account_id: account.id,
            phone_number: phoneNumber,
            message,
            conversation_id: conv?.id,
            lead_id: record.lead_id,
          }),
        });

        const sendResult = await sendRes.json();

        if (!sendResult.success) {
          console.error('[process-queue] Send failed:', sendResult.error);
          await supabase
            .from('whatsapp_automation_control')
            .update({ status: 'active' })
            .eq('id', record.id);
          continue;
        }

        // Determine next step
        const nextStepPosition = record.current_step_position + 1;

        // Check if next step exists in same phase
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
          // More steps in same phase
          const delayMs = nextTemplate.delay_minutes * 60 * 1000;
          nextExecution = new Date(Date.now() + delayMs).toISOString();
          newState = `${record.current_phase}_${record.current_step_position}_sent`;
        } else if (record.current_phase === 'greeting') {
          // Move to followup phase
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
            const delayMs = followupTemplate.delay_minutes * 60 * 1000;
            nextExecution = new Date(Date.now() + delayMs).toISOString();
            newState = 'waiting_reply';
          } else {
            // No followup templates, finish
            newState = 'automation_finished';
          }
        } else {
          // Followup phase done
          newState = 'closed_no_reply';
        }

        const updateData: Record<string, any> = {
          status: nextExecution ? 'active' : 'finished',
          current_phase: newPhase,
          current_step_position: newStep,
          next_execution_at: nextExecution,
          last_followup_sent_at: new Date().toISOString(),
          conversation_state: newState,
          conversation_id: sendResult.conversation_id || conv?.id,
        };

        await supabase
          .from('whatsapp_automation_control')
          .update(updateData)
          .eq('id', record.id);

        console.log('[process-queue] STEP_EXECUTED', {
          automation_id: record.id,
          lead_id: record.lead_id,
          phase: record.current_phase,
          step: record.current_step_position,
          next_phase: newPhase,
          next_step: newStep,
          next_execution_at: nextExecution,
          conversation_state: newState,
        });

        processed++;
      } catch (recordError) {
        console.error('[process-queue] Error processing record:', record.id, recordError);
        // Reset to active so it can be retried
        await supabase
          .from('whatsapp_automation_control')
          .update({ status: 'active' })
          .eq('id', record.id);
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
