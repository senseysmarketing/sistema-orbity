import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function processTemplate(template: any, variables: any): any {
  const jsonString = JSON.stringify(template);
  const processed = jsonString.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const keys = path.trim().split('.');
    let value = variables;
    for (const key of keys) {
      value = value?.[key];
    }
    return value !== undefined ? JSON.stringify(value).slice(1, -1) : match;
  });
  return JSON.parse(processed);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { test, message, notification, userId, agencyId } = await req.json();

    // Get agency configuration
    const { data: config } = await supabase
      .from('notification_integrations')
      .select('custom_webhook_url, custom_webhook_method, custom_webhook_headers, custom_webhook_template, custom_webhook_auth_type, custom_webhook_auth_value')
      .eq('agency_id', agencyId)
      .single();

    if (!config?.custom_webhook_url) {
      throw new Error('Webhook personalizado não configurado');
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.custom_webhook_headers || {}),
    };

    // Add authentication
    if (config.custom_webhook_auth_type === 'bearer' && config.custom_webhook_auth_value) {
      headers['Authorization'] = `Bearer ${config.custom_webhook_auth_value}`;
    } else if (config.custom_webhook_auth_type === 'api_key' && config.custom_webhook_auth_value) {
      headers['X-API-Key'] = config.custom_webhook_auth_value;
    }

    // Build payload from template
    const variables = {
      notification: test ? {
        title: 'Teste de Webhook',
        message: message || 'Este é um teste de webhook personalizado',
        priority: 'medium',
        type: 'test'
      } : notification,
      user: { id: userId },
      timestamp: new Date().toISOString(),
    };

    const payload = config.custom_webhook_template 
      ? processTemplate(config.custom_webhook_template, variables)
      : variables;

    // Send to custom webhook
    const webhookResponse = await fetch(config.custom_webhook_url, {
      method: config.custom_webhook_method || 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      const errorData = await webhookResponse.text();
      console.error('Webhook error:', errorData);
      throw new Error(`Erro ao enviar webhook: ${webhookResponse.statusText}`);
    }

    // Log delivery
    if (!test && notification) {
      await supabase.from('notification_delivery_logs').insert({
        notification_id: notification.id,
        user_id: userId,
        agency_id: agencyId,
        channel: 'custom_webhook',
        status: 'sent',
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-custom-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
