import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { test, phone, message, notification, userId, agencyId } = await req.json();

    // Get agency configuration
    const { data: config, error: configError } = await supabase
      .from('notification_integrations')
      .select('evolution_api_url, evolution_api_key, evolution_instance_name')
      .eq('agency_id', agencyId || test ? null : null)
      .single();

    if (configError && !test) {
      throw new Error('Configuração do WhatsApp não encontrada');
    }

    const evolutionUrl = config?.evolution_api_url || Deno.env.get('EVOLUTION_API_URL');
    const evolutionKey = config?.evolution_api_key || Deno.env.get('EVOLUTION_API_KEY');
    const instanceName = config?.evolution_instance_name || Deno.env.get('EVOLUTION_INSTANCE_NAME');

    if (!evolutionUrl || !evolutionKey || !instanceName) {
      throw new Error('Evolution API não configurada corretamente');
    }

    // Get user's WhatsApp number
    let targetPhone = phone;
    if (userId && !test) {
      const { data: channelData } = await supabase
        .from('user_notification_channels')
        .select('whatsapp_phone')
        .eq('user_id', userId)
        .eq('agency_id', agencyId)
        .single();

      targetPhone = channelData?.whatsapp_phone;
    }

    if (!targetPhone) {
      throw new Error('Número de telefone não configurado');
    }

    // Format message
    const messageText = test ? message : `
🔔 *${notification.title}*

${notification.message}

_${new Date().toLocaleString('pt-BR')}_
    `.trim();

    // Send via Evolution API
    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionKey,
      },
      body: JSON.stringify({
        number: targetPhone.replace(/\D/g, ''),
        text: messageText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Evolution API error:', errorData);
      throw new Error(`Erro ao enviar WhatsApp: ${response.statusText}`);
    }

    const result = await response.json();

    // Log delivery
    if (!test && notification) {
      await supabase.from('notification_delivery_logs').insert({
        notification_id: notification.id,
        user_id: userId,
        agency_id: agencyId,
        channel: 'whatsapp',
        status: 'sent',
      });
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-whatsapp:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
