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

// Normalize strings for matching: lowercase, remove accents, replace _ with space, compact spaces
function normalize(val: string): string {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // remove accents
    .replace(/_/g, " ")               // underscores to spaces
    .replace(/\s+/g, " ")             // compact spaces
    .trim();
}

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

      // Use RPC for pixel + token in single query, fallback to legacy
      const metaConfig = await getMetaPixelConfig(supabase, agency_id);
      let pixelId: string | null = metaConfig?.pixel_id || null;
      let accessToken: string | null = metaConfig?.access_token || null;
      let testEventCode: string | null = metaConfig?.test_event_code || null;

      if (!pixelId) {
        pixelId = await findPixelIdLegacy(supabase, lead, agency_id);
        // Legacy path: no OAuth token available
        accessToken = null;
      }

      if (!pixelId) {
        return new Response(
          JSON.stringify({ message: 'No pixel configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await sendMetaEvent(supabase, lead, agency_id, pixelId, metaEventName, lead.qualification_score || 0, lead.temperature || 'cold', accessToken, testEventCode, eventValue || lead.value);

      return new Response(
        JSON.stringify({ event: metaEventName, status: 'dispatched' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODE 2: Full qualification scoring
    console.log(`[QUALIFICATION] Processing lead ${lead_id} for agency ${agency_id}`);

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      throw new Error(`Lead ${lead_id} not found`);
    }

    const customFields = lead.custom_fields || {};
    if (Object.keys(customFields).length === 0) {
      console.log('[QUALIFICATION] No custom_fields to score');
      // Mark as unconfigured
      await supabase.from('leads').update({
        temperature: 'cold',
        qualification_score: 0,
        qualification_source: 'unconfigured',
      }).eq('id', lead.id);

      return new Response(
        JSON.stringify({ score: 0, qualification: 'cold', message: 'No fields to score' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find form_id using a priority chain:
    // 1. custom_fields.form_id (Meta always includes this in lead data)
    // 2. facebook_lead_sync_log → lead_data.form_id
    // 3. Fallback: infer by matching question keys against scoring rules
    const formId = await resolveFormId(supabase, agency_id, lead_id, customFields);

    let rules: any[] = [];
    if (formId) {
      const { data } = await supabase
        .from('lead_scoring_rules')
        .select('*')
        .eq('agency_id', agency_id)
        .eq('form_id', formId);
      rules = data || [];
    }

    if (rules.length === 0) {
      console.log('[QUALIFICATION] No scoring rules found, marking unconfigured');
      await supabase.from('leads').update({
        temperature: 'cold',
        qualification_score: 0,
        qualification_source: 'unconfigured',
      }).eq('id', lead.id);

      return new Response(
        JSON.stringify({ score: 0, qualification: 'cold', message: 'No rules configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate score with normalized matching
    let totalScore = 0;
    let isBlocked = false;
    const answersDetail: any[] = [];

    for (const [question, answer] of Object.entries(customFields)) {
      const answerStr = String(answer);
      const normalizedAnswer = normalize(answerStr);
      // Normalize question key too: Meta may send "full_name" while rules store "full name"
      const normalizedQuestion = normalize(question);

      // Find matching rule with fully-normalized comparison on both question and answer
      const matchingRule = rules.find(
        (r: any) => normalize(r.question) === normalizedQuestion && normalize(r.answer) === normalizedAnswer
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
        console.log(`[QUALIFICATION] MATCH: ${question} = "${answerStr}" → ${matchingRule.score} pts`);
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

    // Save result (unique on lead_id)
    await supabase
      .from('lead_scoring_results')
      .upsert({
        lead_id: lead.id,
        agency_id: agency_id,
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
    const metaConfig = await getMetaPixelConfig(supabase, agency_id);
    let pixelId: string | null = metaConfig?.pixel_id || null;
    let accessToken: string | null = metaConfig?.access_token || null;
    let testEventCode: string | null = metaConfig?.test_event_code || null;

    if (!pixelId) {
      pixelId = await findPixelIdLegacy(supabase, lead, agency_id);
      accessToken = null;
    }

    if (pixelId) {
      const leadValue = lead.value || 0;

      if (qualification === 'hot') {
        await sendMetaEvent(supabase, lead, agency_id, pixelId, 'Lead', totalScore, qualification, accessToken, testEventCode, leadValue);
        await sendMetaEvent(supabase, lead, agency_id, pixelId, 'QualifiedLead', totalScore, qualification, accessToken, testEventCode, leadValue);
      } else if (qualification === 'cold') {
        await sendMetaEvent(supabase, lead, agency_id, pixelId, 'Lead', totalScore, qualification, accessToken, testEventCode, leadValue);
        await sendMetaEvent(supabase, lead, agency_id, pixelId, 'ColdLead', totalScore, qualification, accessToken, testEventCode, leadValue);
      } else {
        await sendMetaEvent(supabase, lead, agency_id, pixelId, 'Lead', totalScore, qualification, accessToken, testEventCode, leadValue);
      }
    }

    return new Response(
      JSON.stringify({ score: totalScore, qualification, answers: answersDetail }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[QUALIFICATION] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Resolve form_id using a priority chain to find the correct scoring rules form:
// 1. custom_fields.form_id — Meta always includes the form ID in lead data
// 2. facebook_lead_sync_log → lead_data.form_id — reliable for both webhook and synced leads
// 3. Fallback to inferFormId (question overlap matching)
async function resolveFormId(
  supabase: any,
  agencyId: string,
  leadId: string,
  customFields: Record<string, any>
): Promise<string | null> {
  // Helper: check if a given form_id has scoring rules configured
  const hasRules = async (formId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('lead_scoring_rules')
      .select('form_id')
      .eq('agency_id', agencyId)
      .eq('form_id', formId)
      .limit(1)
      .maybeSingle();
    return !!data;
  };

  // 1. Direct: form_id stored in custom_fields by Meta
  const directId = customFields.form_id ? String(customFields.form_id) : null;
  if (directId && await hasRules(directId)) {
    console.log(`[QUALIFICATION] Resolved form_id from custom_fields: ${directId}`);
    return directId;
  }

  // 2. Via facebook_lead_sync_log: the lead_data payload from Meta contains form_id
  const { data: syncLog } = await supabase
    .from('facebook_lead_sync_log')
    .select('lead_data')
    .eq('lead_id', leadId)
    .limit(1)
    .maybeSingle();

  const syncFormId = syncLog?.lead_data?.form_id ? String(syncLog.lead_data.form_id) : null;
  if (syncFormId && syncFormId !== directId && await hasRules(syncFormId)) {
    console.log(`[QUALIFICATION] Resolved form_id from sync_log: ${syncFormId}`);
    return syncFormId;
  }

  // 3. Fallback: infer by question overlap (original algorithm)
  return await inferFormId(supabase, agencyId, customFields);
}

// Infer form_id by matching custom_fields keys against lead_scoring_rules questions
async function inferFormId(supabase: any, agencyId: string, customFields: Record<string, any>): Promise<string | null> {
  // Get all distinct form_ids with their questions for this agency
  const { data: allRules } = await supabase
    .from('lead_scoring_rules')
    .select('form_id, question')
    .eq('agency_id', agencyId);

  if (!allRules || allRules.length === 0) return null;

  // Group questions by form_id
  const formQuestions: Record<string, Set<string>> = {};
  for (const rule of allRules) {
    if (!formQuestions[rule.form_id]) formQuestions[rule.form_id] = new Set();
    formQuestions[rule.form_id].add(rule.question);
  }

  const leadKeys = new Set(Object.keys(customFields));

  // Find form with best overlap
  let bestFormId: string | null = null;
  let bestScore = 0;

  for (const [formId, questions] of Object.entries(formQuestions)) {
    let matches = 0;
    for (const q of questions) {
      if (leadKeys.has(q)) matches++;
    }
    if (matches > bestScore) {
      bestScore = matches;
      bestFormId = formId;
    }
  }

  if (bestFormId) {
    console.log(`[QUALIFICATION] Inferred form_id: ${bestFormId} (${bestScore} matching questions)`);
  }

  return bestFormId;
}

// Returns pixel config + OAuth token in a single query via RPC
async function getMetaPixelConfig(supabase: any, agencyId: string): Promise<{ pixel_id: string; test_event_code: string | null; access_token: string } | null> {
  const { data, error } = await supabase.rpc('get_meta_pixel_config', { p_agency_id: agencyId });
  if (error || !data || data.length === 0) {
    console.log('[META] No pixel config found via RPC, trying legacy fallback');
    return null;
  }
  return data[0];
}

// Legacy fallback: find pixel from facebook_lead_integrations
async function findPixelIdLegacy(supabase: any, lead: any, agencyId: string): Promise<string | null> {
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

  const { data: anyIntegration } = await supabase
    .from('facebook_lead_integrations')
    .select('pixel_id')
    .eq('agency_id', agencyId)
    .not('pixel_id', 'is', null)
    .limit(1)
    .maybeSingle();

  return anyIntegration?.pixel_id || null;
}

async function sendMetaEvent(
  supabase: any,
  lead: any,
  agencyId: string,
  pixelId: string,
  eventName: string,
  score: number,
  qualification: string,
  accessToken: string | null,
  testEventCode: string | null,
  value?: number
) {
  const eventId = `${lead.id}_${eventName}`;

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

  // If no OAuth token from DB, try legacy env var as last resort
  const resolvedToken = accessToken || Deno.env.get('FACEBOOK_ACCESS_TOKEN');
  if (!resolvedToken) {
    console.log('[META EVENT] No access token available (DB or env), logging event only');
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

  const encoder = new TextEncoder();
  const hashData = async (val: string) => {
    const data = encoder.encode(val.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const userData: any = {};
  if (lead.phone) userData.ph = [await hashData(lead.phone)];
  if (lead.email) userData.em = [await hashData(lead.email)];
  if (lead.name) {
    const nameParts = lead.name.trim().split(/\s+/);
    if (nameParts.length > 0) userData.fn = [await hashData(nameParts[0])];
    if (nameParts.length > 1) userData.ln = [await hashData(nameParts.slice(1).join(' '))];
  }
  // external_id como array para melhor Match Quality
  userData.external_id = [await hashData(lead.id)];

  const customData: any = {
    lead_score: score,
    qualification,
    lead_id: lead.id,
  };

  if (value && value > 0) {
    customData.value = value;
    customData.currency = 'BRL';
  }

  const eventPayload: any = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'system_generated',
    event_source_url: 'https://sistema-orbity.lovable.app',
    user_data: userData,
    custom_data: customData,
  };

  const payload: any = { data: [eventPayload] };

  // Incluir test_event_code se configurado (para debugging no Events Manager)
  const apiUrl = testEventCode
    ? `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${resolvedToken}&test_event_code=${testEventCode}`
    : `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${resolvedToken}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

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
