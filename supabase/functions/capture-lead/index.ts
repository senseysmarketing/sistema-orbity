import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookConfig {
  field_mapping: Record<string, string>;
  required_fields: string[];
  default_values: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const agency_id = pathParts[pathParts.length - 1];

    console.log(`[CAPTURE-LEAD] Processing webhook for agency: ${agency_id}`);

    if (!agency_id) {
      return new Response(
        JSON.stringify({ error: 'Agency ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate agency exists and is active
    const { data: agency, error: agencyError } = await supabase
      .from('agencies')
      .select('id, is_active')
      .eq('id', agency_id)
      .single();

    if (agencyError || !agency) {
      console.error('[CAPTURE-LEAD] Agency not found:', agencyError);
      return new Response(
        JSON.stringify({ error: 'Agency not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!agency.is_active) {
      console.error('[CAPTURE-LEAD] Agency is not active');
      return new Response(
        JSON.stringify({ error: 'Agency is not active' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get webhook configuration for the agency
    const { data: webhookConfig } = await supabase
      .from('agency_webhooks')
      .select('*')
      .eq('agency_id', agency_id)
      .eq('events', '{lead_capture}')
      .eq('is_active', true)
      .single();

    let fieldMapping: Record<string, string> = {
      'name': 'name',
      'email': 'email',
      'phone': 'phone',
      'company': 'company',
      'position': 'position',
      'source': 'source',
      'notes': 'notes',
      'value': 'value'
    };

    let defaultValues: Record<string, any> = {
      'status': 'new',
      'priority': 'medium',
      'source': 'webhook'
    };

    // Apply custom configuration if exists
    if (webhookConfig?.headers) {
      const config = webhookConfig.headers as any;
      if (config.field_mapping) {
        fieldMapping = { ...fieldMapping, ...config.field_mapping };
      }
      if (config.default_values) {
        defaultValues = { ...defaultValues, ...config.default_values };
      }
    }

    // Parse incoming data
    let incomingData: any = {};
    
    if (req.method === 'POST') {
      const contentType = req.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        incomingData = await req.json();
      } else if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
          incomingData[key] = value;
        }
      } else {
        // Try to parse as JSON anyway
        const text = await req.text();
        try {
          incomingData = JSON.parse(text);
        } catch {
          incomingData = { raw_data: text };
        }
      }
    } else if (req.method === 'GET') {
      // Parse query parameters
      const params = new URLSearchParams(url.search);
      for (const [key, value] of params.entries()) {
        incomingData[key] = value;
      }
    }

    console.log('[CAPTURE-LEAD] Incoming data:', JSON.stringify(incomingData, null, 2));

    // Map fields according to configuration
    const mappedData: any = { ...defaultValues };
    
    for (const [targetField, sourceField] of Object.entries(fieldMapping)) {
      if (incomingData[sourceField] !== undefined) {
        let value = incomingData[sourceField];
        
        // Sanitize and validate data
        if (typeof value === 'string') {
          value = value.trim();
          
          // Special handling for specific fields
          switch (targetField) {
            case 'email':
              // Basic email validation
              if (value && !value.includes('@')) {
                console.warn('[CAPTURE-LEAD] Invalid email format:', value);
                continue;
              }
              break;
            case 'value':
              // Convert to number if possible
              const numValue = parseFloat(value);
              if (!isNaN(numValue)) {
                value = numValue;
              }
              break;
            case 'phone':
              // Clean phone number
              value = value.replace(/[^\d+\-\s()]/g, '');
              break;
          }
        }
        
        mappedData[targetField] = value;
      }
    }

    // Ensure required fields
    if (!mappedData.name) {
      return new Response(
        JSON.stringify({ error: 'Name is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Add metadata
    mappedData.agency_id = agency_id;
    mappedData.created_by = null; // System created
    mappedData.custom_fields = {
      webhook_source: true,
      original_data: incomingData,
      received_at: new Date().toISOString()
    };

    console.log('[CAPTURE-LEAD] Mapped data:', JSON.stringify(mappedData, null, 2));

    // Insert lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert(mappedData)
      .select()
      .single();

    if (leadError) {
      console.error('[CAPTURE-LEAD] Error inserting lead:', leadError);
      return new Response(
        JSON.stringify({ error: 'Failed to create lead', details: leadError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update webhook statistics
    if (webhookConfig) {
      await supabase
        .from('agency_webhooks')
        .update({
          success_count: (webhookConfig.success_count || 0) + 1,
          last_triggered: new Date().toISOString()
        })
        .eq('id', webhookConfig.id);
    }

    console.log('[CAPTURE-LEAD] Lead created successfully:', lead.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead_id: lead.id,
        message: 'Lead captured successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[CAPTURE-LEAD] Unexpected error:', error);
    
    // Update error count if webhook config exists
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const agency_id = pathParts[pathParts.length - 1];
      
      if (agency_id) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        const { data: webhookConfig } = await supabase
          .from('agency_webhooks')
          .select('id, error_count')
          .eq('agency_id', agency_id)
          .eq('events', '{lead_capture}')
          .single();
          
        if (webhookConfig) {
          await supabase
            .from('agency_webhooks')
            .update({
              error_count: (webhookConfig.error_count || 0) + 1
            })
            .eq('id', webhookConfig.id);
        }
      }
    } catch (updateError) {
      console.error('[CAPTURE-LEAD] Error updating webhook stats:', updateError);
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});