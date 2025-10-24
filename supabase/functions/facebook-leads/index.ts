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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, ...params } = await req.json();
    console.log('Facebook Leads action:', action, 'User:', user.id);

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
      
      case 'webhook_receiver':
        return await handleWebhook(supabase, params);
      
      default:
        throw new Error('Invalid action');
    }
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

  // If no page token provided, try to get from connection (fallback)
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

    accessToken = connection.access_token;
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
      default_status: defaultStatus || 'new',
      default_priority: defaultPriority || 'medium',
      field_mapping: fieldMapping || {},
      created_by: userId
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save integration: ${error.message}`);
  }

  // If webhook method, we could setup Facebook webhook here
  // For now, return success
  
  return new Response(
    JSON.stringify({ success: true, integration: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
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

    // Map to CRM lead fields
    const leadData = {
      agency_id: integration.agency_id,
      name: fieldData.full_name || fieldData.first_name || 'Lead do Facebook',
      email: fieldData.email || null,
      phone: fieldData.phone_number || null,
      company: fieldData.company_name || null,
      status: integration.default_status,
      priority: integration.default_priority,
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

// Handle Webhook from Facebook (future implementation)
async function handleWebhook(supabase: any, params: any) {
  // This would handle real-time webhook notifications from Facebook
  // For now, return not implemented
  return new Response(
    JSON.stringify({ message: 'Webhook handler not yet implemented' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
