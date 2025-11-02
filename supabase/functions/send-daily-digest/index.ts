import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { formatDailyDigest } from "../_shared/formatDailyDigest.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📊 Starting daily digest process...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Get yesterday's date range (in UTC)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    console.log(`📅 Fetching notifications from ${yesterday.toISOString()} to ${yesterdayEnd.toISOString()}`);

    // Get all users with email digest enabled
    const { data: users, error: usersError } = await supabase
      .from('user_notification_channels')
      .select('user_id, agency_id, email_address')
      .eq('email_enabled', true)
      .eq('email_digest', true)
      .not('email_address', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw usersError;
    }

    console.log(`👥 Found ${users?.length || 0} users with digest enabled`);

    let successCount = 0;
    let errorCount = 0;
    let totalNotifications = 0;

    // Process each user
    for (const user of users || []) {
      try {
        // Get yesterday's notifications for this user
        const { data: notifications, error: notifError } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.user_id)
          .eq('agency_id', user.agency_id)
          .gte('created_at', yesterday.toISOString())
          .lte('created_at', yesterdayEnd.toISOString())
          .order('created_at', { ascending: false });

        if (notifError) {
          console.error(`Error fetching notifications for user ${user.user_id}:`, notifError);
          errorCount++;
          continue;
        }

        // Skip if no notifications
        if (!notifications || notifications.length === 0) {
          console.log(`⏭️ Skipping user ${user.user_id} - no notifications`);
          continue;
        }

        totalNotifications += notifications.length;

        // Get user profile for name
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('user_id', user.user_id)
          .single();

        const userName = profile?.name || 'Usuário';

        // Format digest HTML
        const digestHtml = formatDailyDigest(notifications, userName);

        // Send email via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Orbity <contato@notificacoes.orbityapp.com.br>',
            to: [user.email_address],
            subject: `🌅 Seu Resumo Diário - ${notifications.length} notificações`,
            html: digestHtml,
          }),
        });

        if (!resendResponse.ok) {
          const errorData = await resendResponse.text();
          console.error(`Resend API error for user ${user.user_id}:`, errorData);
          errorCount++;
          continue;
        }

        const result = await resendResponse.json();
        console.log(`✅ Digest sent to ${user.email_address} - ${notifications.length} notifications`);

        // Log the delivery
        await supabase.from('notification_delivery_logs').insert({
          user_id: user.user_id,
          agency_id: user.agency_id,
          channel: 'email',
          status: 'sent',
          metadata: {
            digest: true,
            notification_count: notifications.length,
            email_id: result.id,
          }
        });

        successCount++;

      } catch (userError) {
        console.error(`Error processing user ${user.user_id}:`, userError);
        errorCount++;
      }
    }

    const summary = {
      timestamp: now.toISOString(),
      users_processed: users?.length || 0,
      emails_sent: successCount,
      errors: errorCount,
      total_notifications: totalNotifications,
    };

    console.log('📊 Daily digest summary:', summary);

    return new Response(
      JSON.stringify({ success: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-daily-digest:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
