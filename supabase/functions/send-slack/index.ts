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
      .select('slack_webhook_url, slack_channel')
      .eq('agency_id', agencyId)
      .single();

    const webhookUrl = config?.slack_webhook_url;
    if (!webhookUrl) {
      throw new Error('Slack webhook não configurado');
    }

    // Build Slack message with Block Kit
    const blocks = test ? [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🎉 Teste de Integração Slack",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message || "A integração com Slack está funcionando corretamente!"
        }
      }
    ] : [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🔔 ${notification.title}`,
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: notification.message
        }
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `*Prioridade:* ${notification.priority === 'high' ? '🔴 Alta' : notification.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'} | *Tipo:* ${notification.type || 'Notificação'}`
          }
        ]
      },
      {
        type: "divider"
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `_${new Date().toLocaleString('pt-BR')}_`
          }
        ]
      }
    ];

    // Send to Slack
    const slackResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: config?.slack_channel || undefined,
        blocks,
      }),
    });

    if (!slackResponse.ok) {
      const errorData = await slackResponse.text();
      console.error('Slack API error:', errorData);
      throw new Error(`Erro ao enviar para Slack: ${slackResponse.statusText}`);
    }

    // Log delivery
    if (!test && notification) {
      await supabase.from('notification_delivery_logs').insert({
        notification_id: notification.id,
        agency_id: agencyId,
        channel: 'slack',
        status: 'sent',
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-slack:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
