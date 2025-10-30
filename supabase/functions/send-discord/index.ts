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

    const { test, message, notification, agencyId } = await req.json();

    // Get agency configuration
    const { data: config } = await supabase
      .from('notification_integrations')
      .select('discord_webhook_url')
      .eq('agency_id', agencyId)
      .single();

    const webhookUrl = config?.discord_webhook_url;
    if (!webhookUrl) {
      throw new Error('Discord webhook não configurado');
    }

    // Build Discord embed
    const embed = test ? {
      title: "🎉 Teste de Integração Discord",
      description: message || "A integração com Discord está funcionando corretamente!",
      color: 0x667eea,
      timestamp: new Date().toISOString(),
    } : {
      title: `🔔 ${notification.title}`,
      description: notification.message,
      color: notification.priority === 'high' ? 0xef4444 : notification.priority === 'medium' ? 0xf59e0b : 0x10b981,
      fields: [
        {
          name: "Prioridade",
          value: notification.priority === 'high' ? '🔴 Alta' : notification.priority === 'medium' ? '🟡 Média' : '🟢 Baixa',
          inline: true
        },
        {
          name: "Tipo",
          value: notification.type || 'Notificação',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Orbity - Sistema de Gestão"
      }
    };

    // Send to Discord
    const discordResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [embed],
      }),
    });

    if (!discordResponse.ok) {
      const errorData = await discordResponse.text();
      console.error('Discord API error:', errorData);
      throw new Error(`Erro ao enviar para Discord: ${discordResponse.statusText}`);
    }

    // Log delivery
    if (!test && notification) {
      await supabase.from('notification_delivery_logs').insert({
        notification_id: notification.id,
        agency_id: agencyId,
        channel: 'discord',
        status: 'sent',
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-discord:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
