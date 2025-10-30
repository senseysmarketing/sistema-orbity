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

    const { test, email, notification, userId, agencyId } = await req.json();

    // Fixed sender information
    const FROM_EMAIL = "contato@notificacoes.orbityapp.com.br";
    const FROM_NAME = "Orbity";

    // Get user's email configuration
    const { data: channelData } = await supabase
      .from('user_notification_channels')
      .select('email_address, email_enabled, email_notification_types')
      .eq('user_id', userId)
      .eq('agency_id', agencyId)
      .maybeSingle();

    // For test mode, use profile email if no channel config
    let targetEmail = '';
    
    if (test) {
      if (channelData?.email_address) {
        targetEmail = channelData.email_address;
      } else {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', userId)
          .single();

        targetEmail = profileData?.email || '';
      }
    } else {
      // For real notifications, check if user wants to receive emails
      if (!channelData?.email_enabled || !channelData?.email_address) {
        console.log('Email notifications not enabled for user or email not configured');
        return new Response(
          JSON.stringify({ success: false, reason: 'Email not enabled or not configured' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if notification type is allowed
      if (notification && channelData.email_notification_types) {
        const notificationType = notification.type;
        if (!channelData.email_notification_types.includes(notificationType)) {
          console.log(`Notification type ${notificationType} not allowed for user`);
          return new Response(
            JSON.stringify({ success: false, reason: 'Notification type not allowed' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      targetEmail = channelData.email_address;
    }

    if (!targetEmail) {
      throw new Error('Email não configurado');
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY não configurado');
    }

    // Email HTML template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .notification { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 ${test ? 'Teste de Notificação' : notification?.title || 'Notificação'}</h1>
    </div>
    <div class="content">
      <div class="notification">
        <p>${test ? 'Este é um email de teste. Se você recebeu esta mensagem, a integração está funcionando corretamente!' : notification?.message || ''}</p>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        ${new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
      </p>
    </div>
    <div class="footer">
      <p>Você recebeu este email porque está cadastrado no sistema Orbity.</p>
      <p>Para gerenciar suas preferências de notificação, acesse as configurações.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [targetEmail],
        subject: test ? '🎉 Teste de Integração - Email' : notification?.title || 'Notificação',
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      console.error('Resend API error:', errorData);
      throw new Error(`Erro ao enviar email: ${resendResponse.statusText}`);
    }

    const result = await resendResponse.json();

    // Log delivery
    if (!test && notification) {
      await supabase.from('notification_delivery_logs').insert({
        notification_id: notification.id,
        user_id: userId,
        agency_id: agencyId,
        channel: 'email',
        status: 'sent',
      });
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-email-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
