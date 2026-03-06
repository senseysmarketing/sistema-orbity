import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Status CRM → Meta event mapping
const PIPELINE_EVENT_MAP: Record<string, string> = {
  scheduled: 'Schedule',
  proposal: 'SubmitApplication',
  won: 'Purchase',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { lead_id, agency_id, pipeline_event, event_name: customEventName, value: eventValue } = body;

    if (!lead_id || !agency_id) {
      throw new Error('lead_id and agency_id are required');
    }

    // MODE 1: Pipeline event — just fire the Meta event for a status change
    if (pipeline_event) {
      const metaEventName = customEventName || PIPELINE_EVENT_MAP[pipeline_event];
      if (!metaEventName) {
        return new Response(
          JSON.stringify({ message: `No Meta event mapped for status: ${pipeline_event}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', lead_id)
        .single();

      if (!lead) throw new Error(`Lead ${lead_id} not found`);

      // Find pixel_id from integration
      const pixelId = await findPixelId(supabase, lead, agency_id);
      if (!pixelId) {
        console.log('[PIPELINE EVENT] No pixel_id found, skipping');
        return new Response(
          JSON.stringify({ message: 'No pixel configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await sendMetaEvent(supabase, lead, agency_id, pixelId, metaEventName, lead.qualification_score || 0, lead.temperature || 'cold', eventValue || lead.value);

      return new Response(
        JSON.stringify({ event: metaEventName, status: 'dispatched' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODE 2: Full qualification scoring
    console.log(`[QUALIFICATION] Processing lead ${lead_id} for agency ${agency_id}`);

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, facebook_lead_sync_log!inner(integration_id)')
      .eq('id', lead_id)
      .maybeSingle();

    if (leadError || !lead) {
      const { data: leadOnly } = await supabase
        .from('leads')
        .select('*')
        .eq('id', lead_id)
        .single();

      if (!leadOnly) throw new Error(`Lead ${lead_id} not found`);

      console.log('[QUALIFICATION] Lead has no sync log, checking custom_fields directly');
      return await processLeadScoring(supabase, leadOnly, agency_id, null);
    }

    const integrationId = lead.facebook_lead_sync_log?.[0]?.integration_id;
    return await processLeadScoring(supabase, lead, agency_id, integrationId);

  } catch (error) {
    console.error('[QUALIFICATION] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function findPixelId(supabase: any, lead: any, agencyId: string): Promise<string | null> {
  // Try from sync log integration first
  const { data: syncLog } = await supabase
    .from('facebook_lead_sync_log')
    .select('integration_id')
    .eq('lead_id', lead.id)
    .limit(1)
    .maybeSingle();

  if (syncLog?.integration_id) {
    const { data: integration } = await supabase
      .from('facebook_lead_integrations')
      .select('pixel_id')
      .eq('id', syncLog.integration_id)
      .single();
    if (integration?.pixel_id) return integration.pixel_id;
  }

  // Fallback: find any integration with pixel_id for this agency
  const { data: anyIntegration } = await supabase
    .from('facebook_lead_integrations')
    .select('pixel_id')
    .eq('agency_id', agencyId)
    .not('pixel_id', 'is', null)
    .limit(1)
    .maybeSingle();

  return anyIntegration?.pixel_id || null;
}

async function processLeadScoring(supabase: any, lead: any, agencyId: string, integrationId: string | null) {
  const customFields = lead.custom_fields || {};

  if (Object.keys(customFields).length === 0) {
    console.log('[QUALIFICATION] No custom_fields to score');
    return new Response(
      JSON.stringify({ score: 0, qualification: 'cold', message: 'No fields to score' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let formId: string | null = null;
  let pixelId: string | null = null;

  if (integrationId) {
    const { data: integration } = await supabase
      .from('facebook_lead_integrations')
      .select('form_id, pixel_id')
      .eq('id', integrationId)
      .single();

    if (integration) {
      formId = integration.form_id;
      pixelId = integration.pixel_id;
    }
  }

  // Fallback pixel_id
  if (!pixelId) {
    pixelId = await findPixelId(supabase, lead, agencyId);
  }

  let rules: any[] = [];
  if (formId) {
    const { data } = await supabase
      .from('lead_scoring_rules')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('form_id', formId);
    rules = data || [];
  }

  if (rules.length === 0) {
    console.log('[QUALIFICATION] No scoring rules found, skipping');
    return new Response(
      JSON.stringify({ score: 0, qualification: 'cold', message: 'No rules configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Calculate score
  let totalScore = 0;
  let isBlocked = false;
  const answersDetail: any[] = [];

  for (const [question, answer] of Object.entries(customFields)) {
    const answerStr = String(answer);
    const matchingRule = rules.find(
      (r: any) => r.question === question && r.answer === answerStr
    );

    if (matchingRule) {
      if (matchingRule.is_blocker) {
        isBlocked = true;
        answersDetail.push({ question, answer: answerStr, score: matchingRule.score, blocker: true });
        console.log(`[QUALIFICATION] BLOCKER: ${question} = ${answerStr}`);
        break;
      }
      totalScore += matchingRule.score;
      answersDetail.push({ question, answer: answerStr, score: matchingRule.score });
    }
  }

  // Classify
  let qualification = 'cold';
  if (isBlocked) {
    totalScore = -10;
    qualification = 'cold';
  } else if (totalScore >= 5) {
    qualification = 'hot';
  } else if (totalScore >= 2) {
    qualification = 'warm';
  }

  console.log(`[QUALIFICATION] Score: ${totalScore}, Qualification: ${qualification}`);

  // Save result
  await supabase
    .from('lead_scoring_results')
    .upsert({
      lead_id: lead.id,
      agency_id: agencyId,
      score_total: totalScore,
      qualification,
      answers_detail: answersDetail,
      scored_at: new Date().toISOString(),
    }, { onConflict: 'lead_id' })
    .select();

  // Update lead temperature and score
  await supabase
    .from('leads')
    .update({
      temperature: qualification,
      qualification_score: totalScore,
      qualification_source: 'auto',
    })
    .eq('id', lead.id);

  // Fire Meta events based on qualification
  if (pixelId) {
    const leadValue = lead.value || 0;

    if (qualification === 'hot') {
      await sendMetaEvent(supabase, lead, agencyId, pixelId, 'Lead', totalScore, qualification, leadValue);
      await sendMetaEvent(supabase, lead, agencyId, pixelId, 'QualifiedLead', totalScore, qualification, leadValue);
    } else if (qualification === 'cold') {
      await sendMetaEvent(supabase, lead, agencyId, pixelId, 'Lead', totalScore, qualification, leadValue);
      await sendMetaEvent(supabase, lead, agencyId, pixelId, 'ColdLead', totalScore, qualification, leadValue);
    } else {
      // warm
      await sendMetaEvent(supabase, lead, agencyId, pixelId, 'Lead', totalScore, qualification, leadValue);
    }
  }

  return new Response(
    JSON.stringify({ score: totalScore, qualification, answers: answersDetail }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendMetaEvent(
  supabase: any,
  lead: any,
  agencyId: string,
  pixelId: string,
  eventName: string,
  score: number,
  qualification: string,
  value?: number
) {
  const eventId = `${lead.id}_${eventName}`;

  // Idempotency check
  const { data: existing } = await supabase
    .from('meta_conversion_events')
    .select('id')
    .eq('lead_id', lead.id)
    .eq('event_name', eventName)
    .maybeSingle();

  if (existing) {
    console.log(`[META EVENT] ${eventName} already sent for lead ${lead.id}, skipping`);
    return;
  }

  const accessToken = Deno.env.get('FACEBOOK_ACCESS_TOKEN');
  if (!accessToken) {
    console.log('[META EVENT] No FACEBOOK_ACCESS_TOKEN configured, logging event only');
    await supabase.from('meta_conversion_events').insert({
      lead_id: lead.id,
      agency_id: agencyId,
      event_name: eventName,
      event_id: eventId,
      pixel_id: pixelId,
      status: 'skipped',
      response_data: { reason: 'no_access_token' },
    });
    return;
  }

  // Hash user data — enhanced with first_name, last_name
  const encoder = new TextEncoder();
  const hashData = async (val: string) => {
    const data = encoder.encode(val.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const userData: any = {};
  if (lead.phone) userData.ph = [await hashData(lead.phone)];
  if (lead.email) userData.em = [await hashData(lead.email)];

  // Extract first_name and last_name from lead.name
  if (lead.name) {
    const nameParts = lead.name.trim().split(/\s+/);
    if (nameParts.length > 0) {
      userData.fn = [await hashData(nameParts[0])];
    }
    if (nameParts.length > 1) {
      userData.ln = [await hashData(nameParts.slice(1).join(' '))];
    }
  }

  const customData: any = {
    lead_score: score,
    qualification,
    lead_id: lead.id,
  };

  // Value-based optimization
  if (value && value > 0) {
    customData.value = value;
    customData.currency = 'BRL';
  }

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'system_generated',
      user_data: userData,
      custom_data: customData,
    }],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const responseData = await response.json();
    const status = response.ok ? 'sent' : 'failed';

    await supabase.from('meta_conversion_events').insert({
      lead_id: lead.id,
      agency_id: agencyId,
      event_name: eventName,
      event_id: eventId,
      pixel_id: pixelId,
      status,
      response_data: responseData,
    });

    console.log(`[META EVENT] ${eventName} (event_id: ${eventId}) ${status} for lead ${lead.id}`);
  } catch (error) {
    console.error(`[META EVENT] Failed to send ${eventName}:`, error);
    await supabase.from('meta_conversion_events').insert({
      lead_id: lead.id,
      agency_id: agencyId,
      event_name: eventName,
      event_id: eventId,
      pixel_id: pixelId,
      status: 'failed',
      response_data: { error: error.message },
    });
  }
}
