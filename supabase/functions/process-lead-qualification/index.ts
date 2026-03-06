import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { lead_id, agency_id } = await req.json();
    if (!lead_id || !agency_id) {
      throw new Error('lead_id and agency_id are required');
    }

    console.log(`[QUALIFICATION] Processing lead ${lead_id} for agency ${agency_id}`);

    // 1. Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, facebook_lead_sync_log!inner(integration_id)')
      .eq('id', lead_id)
      .maybeSingle();

    if (leadError || !lead) {
      // Try without the join (lead might not have sync log)
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

async function processLeadScoring(supabase: any, lead: any, agencyId: string, integrationId: string | null) {
  const customFields = lead.custom_fields || {};
  
  if (Object.keys(customFields).length === 0) {
    console.log('[QUALIFICATION] No custom_fields to score');
    return new Response(
      JSON.stringify({ score: 0, qualification: 'cold', message: 'No fields to score' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 2. Get integration details for form_id and pixel_id
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

  // If no form_id from integration, try to find rules for any form in this agency
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

  // 3. Calculate score
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

  // 4. Classify
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

  // 5. Save result
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

  // 6. Update lead temperature and score
  await supabase
    .from('leads')
    .update({
      temperature: qualification,
      qualification_score: totalScore,
      qualification_source: 'auto',
    })
    .eq('id', lead.id);

  // 7. If HOT and pixel configured, fire QualifiedLead event
  if (qualification === 'hot' && pixelId) {
    await sendMetaEvent(supabase, lead, agencyId, pixelId, 'Lead', totalScore, qualification);
    await sendMetaEvent(supabase, lead, agencyId, pixelId, 'QualifiedLead', totalScore, qualification);
  } else if (pixelId) {
    // Fire Lead event for all scored leads
    await sendMetaEvent(supabase, lead, agencyId, pixelId, 'Lead', totalScore, qualification);
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
  qualification: string
) {
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
      pixel_id: pixelId,
      status: 'skipped',
      response_data: { reason: 'no_access_token' },
    });
    return;
  }

  // Hash user data
  const encoder = new TextEncoder();
  const hashData = async (value: string) => {
    const data = encoder.encode(value.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const userData: any = {};
  if (lead.phone) userData.ph = [await hashData(lead.phone)];
  if (lead.email) userData.em = [await hashData(lead.email)];

  const payload = {
    data: [{
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'system_generated',
      user_data: userData,
      custom_data: {
        lead_score: score,
        qualification,
        lead_id: lead.id,
      },
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
      pixel_id: pixelId,
      status,
      response_data: responseData,
    });

    console.log(`[META EVENT] ${eventName} ${status} for lead ${lead.id}`);
  } catch (error) {
    console.error(`[META EVENT] Failed to send ${eventName}:`, error);
    await supabase.from('meta_conversion_events').insert({
      lead_id: lead.id,
      agency_id: agencyId,
      event_name: eventName,
      pixel_id: pixelId,
      status: 'failed',
      response_data: { error: error.message },
    });
  }
}
