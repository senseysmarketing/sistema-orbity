import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    console.log(`[WEBHOOK] Request received - Method: ${req.method}, Path: ${url.pathname}`);
    
    // Facebook webhook verification (GET request)
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      
      const verifyToken = Deno.env.get('FACEBOOK_VERIFY_TOKEN');
      
      console.log(`[WEBHOOK] Verification attempt - Mode: ${mode}, Token match: ${token === verifyToken}`);
      
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('[WEBHOOK] ✅ Verification successful');
        return new Response(challenge, { status: 200 });
      } else {
        console.error('[WEBHOOK] ❌ Verification failed');
        return new Response('Forbidden', { status: 403 });
      }
    }
    
    // POST requests - can be API calls OR Facebook webhooks
    if (req.method === 'POST') {
      const body = await req.json();
      
      // If body has 'action' field, it's an API call from our app
      if (body.action) {
        console.log('[API] Action:', body.action);
        
        // API calls require authentication
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
          return new Response(
            JSON.stringify({ error: 'No authorization header' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );

        if (authError || !user) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { action, ...params } = body;
        console.log('[API] Processing action:', action, 'User:', user.id);

        switch (action) {
          case 'list_pages':
            return await listPages(supabase, user.id, params);
          
          case 'list_forms':
            return await listForms(supabase, user.id, params);
          
          case 'save_integration':
            return await saveIntegration(supabase, user.id, params);
          
          case 'get_integrations':
            return await getIntegrations(supabase, user.id, params);
          
          case 'delete_integration':
            return await deleteIntegration(supabase, user.id, params);
          
          case 'sync_leads':
            return await syncLeads(supabase, user.id, params);
          
          case 'subscribe_webhook':
            return await subscribeWebhook(supabase, user.id, params);
          
          default:
            return new Response(
              JSON.stringify({ error: 'Invalid action' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
      }
      
      // No 'action' field = Facebook webhook
      console.log('[WEBHOOK] 📥 Facebook webhook received:', JSON.stringify(body, null, 2));
      return await handleWebhook(supabase, body);
    }

    // Any other method
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// List Facebook Pages
async function listPages(supabase: any, userId: string, params: any) {
  const { agencyId } = params;

  // Get active Facebook connection
  const { data: connection, error: connError } = await supabase
    .from('facebook_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .single();

  if (connError || !connection) {
    throw new Error('No active Facebook connection found');
  }

  // Fetch all pages with pagination from Facebook Graph API
  let allPages: any[] = [];
  let nextUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${connection.access_token}&limit=100`;

  while (nextUrl) {
    const pagesResponse = await fetch(nextUrl);
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
      throw new Error(`Facebook API error: ${pagesData.error.message}`);
    }

    allPages = [...allPages, ...(pagesData.data || [])];
    nextUrl = pagesData.paging?.next || null;
  }

  console.log(`Fetched ${allPages.length} pages for agency ${agencyId}`);

  return new Response(
    JSON.stringify({ pages: allPages }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// List Lead Forms for a Page
async function listForms(supabase: any, userId: string, params: any) {
  const { agencyId, pageId, pageAccessToken } = params;

  // Use the page access token directly if provided
  let accessToken = pageAccessToken;

  // If no page token provided, get it from the Graph API using user token
  if (!accessToken) {
    const { data: connection, error: connError } = await supabase
      .from('facebook_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .single();

    if (connError || !connection) {
      throw new Error('No active Facebook connection found');
    }

    // Fetch the page-specific access token from Graph API
    const pageTokenUrl = `https://graph.facebook.com/v18.0/${pageId}?fields=access_token,name&access_token=${connection.access_token}`;
    const pageTokenResp = await fetch(pageTokenUrl);
    const pageTokenData = await pageTokenResp.json();

    if (pageTokenData.error) {
      console.error(`Failed to get page token for ${pageId}:`, pageTokenData.error);
      throw new Error(`Facebook API error: ${pageTokenData.error.message}`);
    }

    accessToken = pageTokenData.access_token;
    console.log(`Got page token for page ${pageId} (${pageTokenData.name})`);
  }

  // Fetch lead forms from Facebook Graph API using page access token
  const formsUrl = `https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?access_token=${accessToken}`;
  const formsResponse = await fetch(formsUrl);
  const formsData = await formsResponse.json();

  if (formsData.error) {
    throw new Error(`Facebook API error: ${formsData.error.message}`);
  }

  return new Response(
    JSON.stringify({ forms: formsData.data || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Save Integration
async function saveIntegration(supabase: any, userId: string, params: any) {
  const {
    agencyId,
    connectionId,
    pageId,
    pageName,
    pageAccessToken,
    formId,
    formName,
    syncMethod,
    defaultStatus,
    defaultPriority,
    fieldMapping
  } = params;

  const { data, error } = await supabase
    .from('facebook_lead_integrations')
    .insert({
      agency_id: agencyId,
      connection_id: connectionId,
      page_id: pageId,
      page_name: pageName,
      form_id: formId,
      form_name: formName,
      sync_method: syncMethod || 'webhook',
      // Evita status legado ("new") que pode não existir como coluna no pipeline
      default_status: defaultStatus || 'leads',
      default_priority: defaultPriority || 'cold',
      field_mapping: fieldMapping || {},
      created_by: userId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save integration: ${error.message}`);
  }

  // Auto-subscribe webhook after saving integration
  try {
    await setupWebhookSubscription(pageId, pageAccessToken, data.id);
    console.log(`✅ Webhook configured successfully for integration ${data.id}`);
  } catch (webhookError) {
    console.error('❌ Failed to setup webhook:', webhookError);
    // Don't fail the entire operation, just log the error
  }
  
  return new Response(
    JSON.stringify({ success: true, integration: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Setup webhook subscription on Facebook page
async function setupWebhookSubscription(pageId: string, pageAccessToken: string, integrationId: string) {
  const webhookUrl = `https://ovookkywclrqfmtumelw.functions.supabase.co/facebook-leads`;
  const verifyToken = Deno.env.get('FACEBOOK_VERIFY_TOKEN');

  const subscribeUrl = `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`;
  const response = await fetch(subscribeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscribed_fields: ['leadgen'],
      access_token: pageAccessToken
    })
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Facebook webhook subscription failed: ${data.error.message}`);
  }

  console.log(`Webhook subscribed for page ${pageId}, integration ${integrationId}`);
  return data;
}

// Subscribe webhook manually
async function subscribeWebhook(supabase: any, userId: string, params: any) {
  const { integrationId, pageAccessToken } = params;

  const { data: integration, error: intError } = await supabase
    .from('facebook_lead_integrations')
    .select('*')
    .eq('id', integrationId)
    .single();

  if (intError || !integration) {
    throw new Error('Integration not found');
  }

  try {
    await setupWebhookSubscription(integration.page_id, pageAccessToken, integrationId);

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook ativado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    throw new Error(`Failed to subscribe webhook: ${error.message}`);
  }
}

// Get Integrations
async function getIntegrations(supabase: any, userId: string, params: any) {
  const { agencyId } = params;

  const { data, error } = await supabase
    .from('facebook_lead_integrations')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch integrations: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ integrations: data || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Delete Integration
async function deleteIntegration(supabase: any, userId: string, params: any) {
  const { integrationId } = params;

  const { error } = await supabase
    .from('facebook_lead_integrations')
    .delete()
    .eq('id', integrationId);

  if (error) {
    throw new Error(`Failed to delete integration: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Sync Leads from Facebook
async function syncLeads(supabase: any, userId: string, params: any) {
  const { integrationId } = params;

  // Get integration details
  const { data: integration, error: intError } = await supabase
    .from('facebook_lead_integrations')
    .select('*, facebook_connections(*)')
    .eq('id', integrationId)
    .single();

  if (intError || !integration) {
    throw new Error('Integration not found');
  }

  if (!integration.facebook_connections) {
    throw new Error('Facebook connection not found');
  }

  const accessToken = integration.facebook_connections.access_token;

  // Fetch leads from Facebook
  const leadsUrl = `https://graph.facebook.com/v18.0/${integration.form_id}/leads?access_token=${accessToken}`;
  const leadsResponse = await fetch(leadsUrl);
  const leadsData = await leadsResponse.json();

  if (leadsData.error) {
    throw new Error(`Facebook API error: ${leadsData.error.message}`);
  }

  const leads = leadsData.data || [];
  let syncedCount = 0;
  let skippedCount = 0;

  // Process each lead
  for (const fbLead of leads) {
    // Check if already synced
    const { data: existing } = await supabase
      .from('facebook_lead_sync_log')
      .select('id')
      .eq('integration_id', integrationId)
      .eq('facebook_lead_id', fbLead.id)
      .single();

    if (existing) {
      skippedCount++;
      continue;
    }

    // Parse field data
    const fieldData: any = {};
    if (fbLead.field_data) {
      fbLead.field_data.forEach((field: any) => {
        fieldData[field.name] = field.values ? field.values[0] : '';
      });
    }

    // Mapeamento de valores legados para temperatura válida
    const temperatureMapping: Record<string, string> = {
      'cold': 'cold', 'warm': 'warm', 'hot': 'hot',
      'low': 'cold', 'medium': 'warm', 'high': 'hot'
    };

    // Normaliza status legado
    const normalizedStatus = integration.default_status === 'new' ? 'leads' : integration.default_status;

    // Map to CRM lead fields
    const leadData = {
      agency_id: integration.agency_id,
      name: fieldData.full_name || fieldData.first_name || 'Lead do Facebook',
      email: fieldData.email || null,
      phone: fieldData.phone_number || null,
      company: fieldData.company_name || null,
      status: normalizedStatus,
      temperature: temperatureMapping[integration.default_priority] || 'cold',
      source: 'facebook_leads',
      notes: `Lead capturado do formulário: ${integration.form_name}\nData: ${new Date(fbLead.created_time).toLocaleString('pt-BR')}`,
      custom_fields: fieldData,
      created_by: integration.created_by
    };

    // Insert lead into CRM
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (leadError) {
      console.error('Failed to insert lead:', leadError);
      continue;
    }

    // Log sync
    await supabase
      .from('facebook_lead_sync_log')
      .insert({
        integration_id: integrationId,
        agency_id: integration.agency_id,
        facebook_lead_id: fbLead.id,
        lead_id: newLead.id,
        lead_data: fbLead
      });

    syncedCount++;
  }

  // Update last sync time
  await supabase
    .from('facebook_lead_integrations')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', integrationId);

  return new Response(
    JSON.stringify({ 
      success: true, 
      synced: syncedCount,
      skipped: skippedCount,
      total: leads.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handle Webhook from Facebook
async function handleWebhook(supabase: any, body: any) {
  console.log('[WEBHOOK] 🔄 Processing webhook:', JSON.stringify(body, null, 2));

  if (body.object !== 'page') {
    console.log('[WEBHOOK] ⚠️ Not a page event, ignoring');
    return new Response(JSON.stringify({ message: 'Not a page event' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Process each entry in the webhook
  for (const entry of body.entry || []) {
    const pageId = entry.id;
    console.log(`[WEBHOOK] 📄 Processing entry for page: ${pageId}`);
    
    for (const change of entry.changes || []) {
      console.log(`[WEBHOOK] 🔍 Change detected - Field: ${change.field}`);
      
      if (change.field !== 'leadgen') {
        console.log('[WEBHOOK] ⏭️ Skipping non-leadgen event');
        continue;
      }

      const leadgenId = change.value?.leadgen_id;
      const formId = change.value?.form_id;

      if (!leadgenId || !formId) {
        console.log('[WEBHOOK] ⚠️ Missing leadgen_id or form_id');
        continue;
      }

      console.log(`[WEBHOOK] 🎯 New lead detected - Page: ${pageId}, Form: ${formId}, Lead: ${leadgenId}`);

      // Find matching integration - support exact form_id OR 'all' forms
      console.log(`[WEBHOOK] 🔎 Looking for integration - Page: ${pageId}, Form: ${formId}`);
      
      let integration = null;

      // First try exact form match
      const { data: exactMatch, error: exactError } = await supabase
        .from('facebook_lead_integrations')
        .select('*, facebook_connections(*)')
        .eq('page_id', pageId)
        .eq('form_id', formId)
        .eq('is_active', true)
        .maybeSingle();

      if (exactError) {
        console.error('[WEBHOOK] ❌ Error fetching exact integration:', exactError);
      }

      if (exactMatch) {
        integration = exactMatch;
        console.log('[WEBHOOK] ✅ Found exact form match');
      } else {
        // Try 'all' forms fallback
        console.log('[WEBHOOK] 🔄 No exact match, trying form_id = "all"...');
        const { data: allMatch, error: allError } = await supabase
          .from('facebook_lead_integrations')
          .select('*, facebook_connections(*)')
          .eq('page_id', pageId)
          .eq('form_id', 'all')
          .eq('is_active', true)
          .maybeSingle();

        if (allError) {
          console.error('[WEBHOOK] ❌ Error fetching all-forms integration:', allError);
        }

        if (allMatch) {
          integration = allMatch;
          console.log('[WEBHOOK] ✅ Found "all forms" integration');
        }
      }

      if (!integration) {
        console.error('[WEBHOOK] ❌ No active integration found for this page/form');
        continue;
      }

      console.log(`[WEBHOOK] ✅ Integration found: ${integration.id}`);

      // Check if lead already processed
      const { data: existing } = await supabase
        .from('facebook_lead_sync_log')
        .select('id')
        .eq('facebook_lead_id', leadgenId)
        .maybeSingle();

      if (existing) {
        console.log(`[WEBHOOK] ⚠️ Lead ${leadgenId} already processed, skipping`);
        continue;
      }

      // Fetch full lead data from Facebook
      const accessToken = integration.facebook_connections.access_token;
      const leadUrl = `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${accessToken}`;
      
      const leadResponse = await fetch(leadUrl);
      const leadData = await leadResponse.json();

      if (leadData.error) {
        console.error('Error fetching lead data:', leadData.error);
        continue;
      }

      // Parse field data
      const fieldData: any = {};
      if (leadData.field_data) {
        leadData.field_data.forEach((field: any) => {
          fieldData[field.name] = field.values ? field.values[0] : '';
        });
      }

      // Mapeamento de valores legados para temperatura válida
      const temperatureMapping: Record<string, string> = {
        'cold': 'cold', 'warm': 'warm', 'hot': 'hot',
        'low': 'cold', 'medium': 'warm', 'high': 'hot'
      };

      // Normaliza status legado
      const normalizedStatus = integration.default_status === 'new' ? 'leads' : integration.default_status;

      // Create lead in CRM
      const crmLeadData = {
        agency_id: integration.agency_id,
        name: fieldData.full_name || fieldData.first_name || 'Lead do Facebook',
        email: fieldData.email || null,
        phone: fieldData.phone_number || null,
        company: fieldData.company_name || null,
        status: normalizedStatus,
        temperature: temperatureMapping[integration.default_priority] || 'cold',
        source: 'facebook_leads',
        notes: `🚀 Lead capturado automaticamente via webhook\nFormulário: ${integration.form_name}\nPágina: ${integration.page_name}\nData: ${new Date(leadData.created_time).toLocaleString('pt-BR')}`,
        custom_fields: fieldData,
        created_by: integration.created_by
      };

      const { data: newLead, error: leadError } = await supabase
        .from('leads')
        .insert(crmLeadData)
        .select()
        .single();

      if (leadError) {
        console.error('Failed to create lead:', leadError);
        continue;
      }

      // Log successful sync
      await supabase
        .from('facebook_lead_sync_log')
        .insert({
          integration_id: integration.id,
          agency_id: integration.agency_id,
          facebook_lead_id: leadgenId,
          lead_id: newLead.id,
          lead_data: leadData,
          sync_method: 'webhook'
        });

      console.log(`✅ Lead ${leadgenId} successfully created in CRM as ${newLead.id}`);

      // Trigger lead qualification scoring
      try {
        const qualificationUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-lead-qualification`;
        const qualResponse = await fetch(qualificationUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_id: newLead.id, agency_id: integration.agency_id }),
        });
        const qualResult = await qualResponse.json();
        console.log(`[QUALIFICATION] Result for ${newLead.id}:`, qualResult);
      } catch (qualError) {
        console.error('[QUALIFICATION] Error triggering qualification:', qualError);
      }
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
