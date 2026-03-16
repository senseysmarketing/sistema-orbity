import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fixed field mapping – known CRM fields
const KNOWN_FIELDS = new Set([
  'name', 'email', 'phone', 'company', 'position', 'source', 'notes', 'value'
]);

// Auto-enroll a new lead in WhatsApp automation
async function autoEnrollWhatsAppAutomation(supabase: any, agencyId: string, leadId: string, phone: string) {
  const { data: waAccount } = await supabase
    .from('whatsapp_accounts')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('status', 'connected')
    .maybeSingle();

  if (!waAccount) return;

  const { data: firstTemplate } = await supabase
    .from('whatsapp_message_templates')
    .select('delay_minutes')
    .eq('agency_id', agencyId)
    .eq('phase', 'greeting')
    .eq('step_position', 1)
    .eq('is_active', true)
    .maybeSingle();

  if (!firstTemplate) return;

  const { data: existing } = await supabase
    .from('whatsapp_automation_control')
    .select('id')
    .eq('account_id', waAccount.id)
    .eq('lead_id', leadId)
    .maybeSingle();

  if (existing) return;

  // Get or create conversation
  let conversationId: string | null = null;
  const { data: existingConv } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('account_id', waAccount.id)
    .eq('lead_id', leadId)
    .maybeSingle();

  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    const { data: newConv, error: convError } = await supabase
      .from('whatsapp_conversations')
      .insert({ account_id: waAccount.id, phone_number: phone, lead_id: leadId })
      .select('id')
      .single();
    if (convError) { console.error('[CAPTURE-LEAD] WA conv error:', convError); return; }
    conversationId = newConv.id;
  }

  const nextExecution = new Date(Date.now() + firstTemplate.delay_minutes * 60 * 1000);

  const { error } = await supabase
    .from('whatsapp_automation_control')
    .insert({
      account_id: waAccount.id,
      lead_id: leadId,
      conversation_id: conversationId,
      status: 'active',
      current_phase: 'greeting',
      current_step_position: 1,
      next_execution_at: nextExecution.toISOString(),
      conversation_state: 'new_lead',
    });

  if (error) { console.error('[CAPTURE-LEAD] WA automation error:', error); return; }
  console.log(`[CAPTURE-LEAD] ✅ Auto-enrolled lead ${leadId} in WhatsApp automation`);
}

// Trigger lead qualification scoring
async function triggerLeadQualification(leadId: string, agencyId: string) {
  try {
    const qualUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-lead-qualification`;
    const resp = await fetch(qualUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ lead_id: leadId, agency_id: agencyId }),
    });
    console.log(`[CAPTURE-LEAD] Qualification triggered for ${leadId}: ${resp.status}`);
  } catch (err) {
    console.error('[CAPTURE-LEAD] Qualification error:', err);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const agency_id = pathParts[pathParts.length - 1];

    if (!agency_id) {
      return new Response(JSON.stringify({ error: 'Agency ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate agency
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('id, is_active')
      .eq('id', agency_id)
      .single();

    if (agencyError || !agency) {
      return new Response(JSON.stringify({ error: 'Agency not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!agency.is_active) {
      return new Response(JSON.stringify({ error: 'Agency is not active' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load default_values from webhook config (status, source only)
    let defaultStatus = 'leads';
    let defaultSource = 'webhook';

    const { data: webhookConfig } = await supabase
      .from('agency_webhooks')
      .select('*')
      .eq('agency_id', agency_id)
      .eq('events', '{lead_capture}')
      .eq('is_active', true)
      .maybeSingle();

    if (webhookConfig?.headers) {
      const cfg = webhookConfig.headers as any;
      if (cfg.default_values?.status) defaultStatus = cfg.default_values.status;
      if (cfg.default_values?.source) defaultSource = cfg.default_values.source;
    }

    // Parse incoming data (POST JSON, form-urlencoded, GET params)
    let incomingData: Record<string, any> = {};

    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        incomingData = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
          incomingData[key] = value;
        }
      } else {
        const text = await req.text();
        try { incomingData = JSON.parse(text); } catch { incomingData = { raw_data: text }; }
      }
    } else if (req.method === 'GET') {
      for (const [key, value] of new URLSearchParams(url.search).entries()) {
        incomingData[key] = value;
      }
    }

    console.log('[CAPTURE-LEAD] Incoming:', JSON.stringify(incomingData));

    // Separate known fields vs custom fields
    const leadData: Record<string, any> = {};
    const customFields: Record<string, any> = {};

    for (const [key, rawValue] of Object.entries(incomingData)) {
      let value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
      if (value === '' || value === null || value === undefined) continue;

      if (KNOWN_FIELDS.has(key)) {
        // Validate/sanitize known fields
        switch (key) {
          case 'email':
            if (typeof value === 'string' && !value.includes('@')) continue;
            break;
          case 'value':
            const num = parseFloat(String(value));
            if (!isNaN(num)) value = num;
            break;
          case 'phone':
            if (typeof value === 'string') value = value.replace(/[^\d+\-\s()]/g, '');
            break;
        }
        leadData[key] = value;
      } else {
        // Everything else → custom_fields (flat, for qualification scoring)
        customFields[key] = value;
      }
    }

    // Ensure name
    if (!leadData.name) {
      return new Response(JSON.stringify({ error: 'Name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get agency admin
    const { data: agencyAdmin } = await supabase
      .from('agency_users')
      .select('user_id')
      .eq('agency_id', agency_id)
      .in('role', ['owner', 'admin'])
      .limit(1)
      .single();

    if (!agencyAdmin) {
      return new Response(JSON.stringify({ error: 'No admin found for agency' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build final lead record
    const insertData = {
      ...leadData,
      agency_id,
      created_by: agencyAdmin.user_id,
      status: leadData.source ? undefined : undefined, // clear, set below
      temperature: 'cold',
      source: leadData.source || defaultSource,
      custom_fields: {
        ...customFields,
        form_id: 'webhook_default',
        webhook_source: true,
        received_at: new Date().toISOString(),
      },
    };
    // Apply default status (can be overridden by payload 'status' field if present, but we keep simple)
    insertData.status = defaultStatus;

    console.log('[CAPTURE-LEAD] Insert:', JSON.stringify(insertData));

    // Insert lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert(insertData)
      .select()
      .single();

    if (leadError) {
      console.error('[CAPTURE-LEAD] Insert error:', leadError);
      if (webhookConfig) {
        await supabase.from('agency_webhooks').update({ error_count: (webhookConfig.error_count || 0) + 1 }).eq('id', webhookConfig.id);
      }
      return new Response(JSON.stringify({ error: 'Failed to create lead', details: leadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update webhook stats
    if (webhookConfig) {
      await supabase.from('agency_webhooks').update({
        success_count: (webhookConfig.success_count || 0) + 1,
        last_triggered: new Date().toISOString()
      }).eq('id', webhookConfig.id);
    }

    console.log('[CAPTURE-LEAD] ✅ Lead created:', lead.id);

    // Trigger qualification scoring (async, non-blocking pattern)
    triggerLeadQualification(lead.id, agency_id);

    // Auto-enroll in WhatsApp automation
    if (lead.phone) {
      autoEnrollWhatsAppAutomation(supabase, agency_id, lead.id, lead.phone).catch(err =>
        console.error('[CAPTURE-LEAD] WA enrollment error:', err)
      );
    }

    return new Response(JSON.stringify({ success: true, lead_id: lead.id, message: 'Lead captured successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[CAPTURE-LEAD] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
