import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getEvolutionConfig() {
  const apiUrl = (Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '');
  const apiKey = Deno.env.get('EVOLUTION_API_KEY') || '';
  if (!apiUrl || !apiKey) throw new Error('Evolution API not configured (missing EVOLUTION_API_URL or EVOLUTION_API_KEY)');
  return { apiUrl, apiKey };
}

function generateInstanceName(agencyId: string): string {
  return `orbity_${agencyId.substring(0, 8)}`;
}

async function configureWebhook(apiUrl: string, apiKey: string, instanceName: string) {
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;
  const endpoint = `${apiUrl}/webhook/set/${instanceName}`;

  const payload = {
    webhook: {
      enabled: true,
      url: webhookUrl,
      byEvents: true,
      base64: false,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE',
        'SEND_MESSAGE',
      ],
    },
  };

  console.log('[whatsapp-connect] Webhook endpoint:', endpoint);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
      body: JSON.stringify(payload),
    });

    const data = await res.text();
    console.log('[whatsapp-connect] Webhook response status:', res.status);

    try {
      return { success: res.ok, data: JSON.parse(data) };
    } catch {
      return { success: res.ok, data };
    }
  } catch (e) {
    console.error('[whatsapp-connect] Webhook configuration failed:', e.message);
    return { success: false, error: e.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { action, agency_id } = await req.json();

    // Verify user belongs to agency
    const { data: membership } = await supabase
      .from('agency_users')
      .select('role')
      .eq('user_id', user.id)
      .eq('agency_id', agency_id)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Unauthorized: admin access required');
    }

    // Get centralized Evolution config
    const { apiUrl, apiKey } = getEvolutionConfig();

    switch (action) {
      case 'connect': {
        const instanceName = generateInstanceName(agency_id);

        // Save account info
        const { data: account, error: upsertError } = await supabase
          .from('whatsapp_accounts')
          .upsert({
            agency_id,
            instance_name: instanceName,
            api_url: apiUrl,
            api_key: apiKey,
            status: 'connecting',
          }, { onConflict: 'agency_id' })
          .select()
          .single();

        if (upsertError) throw upsertError;

        // Create instance on Evolution API
        try {
          const createRes = await fetch(`${apiUrl}/instance/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKey,
            },
            body: JSON.stringify({
              instanceName,
              integration: 'WHATSAPP-BAILEYS',
              qrcode: true,
            }),
          });

          const createData = await createRes.json();

          if (!createRes.ok && createRes.status !== 409) {
            throw new Error(`Evolution API error: ${JSON.stringify(createData)}`);
          }
        } catch (e) {
          console.log('Instance create result:', e.message);
        }

        // Configure webhook automatically
        await configureWebhook(apiUrl, apiKey, instanceName);

        // Get QR code
        const qrRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
          method: 'GET',
          headers: { 'apikey': apiKey },
        });

        const qrData = await qrRes.json();

        if (qrData.base64) {
          await supabase
            .from('whatsapp_accounts')
            .update({ qr_code: qrData.base64, status: 'connecting' })
            .eq('id', account.id);

          return new Response(JSON.stringify({
            success: true,
            qr_code: qrData.base64,
            status: 'connecting',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Already connected
        await supabase
          .from('whatsapp_accounts')
          .update({ status: 'connected', qr_code: null })
          .eq('id', account.id);

        return new Response(JSON.stringify({
          success: true,
          status: 'connected',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'status': {
        const { data: account } = await supabase
          .from('whatsapp_accounts')
          .select('*')
          .eq('agency_id', agency_id)
          .single();

        if (!account) {
          return new Response(JSON.stringify({ success: true, status: 'disconnected' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const effectiveUrl = account.api_url || apiUrl;
        const effectiveKey = account.api_key || apiKey;
        const instanceName = account.instance_name;

        try {
          const statusRes = await fetch(
            `${effectiveUrl}/instance/connectionState/${instanceName}`,
            { headers: { 'apikey': effectiveKey } }
          );
          const statusData = await statusRes.json();

          const isConnected = statusData?.instance?.state === 'open';
          const newStatus = isConnected ? 'connected' : 'disconnected';

          if (account.status !== newStatus) {
            await supabase
              .from('whatsapp_accounts')
              .update({ status: newStatus, qr_code: isConnected ? null : account.qr_code })
              .eq('id', account.id);
          }

          // Re-configure webhook when connected (auto-healing)
          if (isConnected) {
            await configureWebhook(effectiveUrl, effectiveKey, instanceName);
          }

          // If disconnected, auto-fetch new QR code
          let qr_code = null;
          if (!isConnected) {
            try {
              const qrRes = await fetch(
                `${effectiveUrl}/instance/connect/${instanceName}`,
                { headers: { 'apikey': effectiveKey } }
              );
              const qrData = await qrRes.json();
              if (qrData.base64) {
                qr_code = qrData.base64;
                await supabase
                  .from('whatsapp_accounts')
                  .update({ qr_code: qrData.base64, status: 'connecting' })
                  .eq('id', account.id);
              }
            } catch (qrErr) {
              console.log('QR fetch error (non-critical):', qrErr.message);
            }
          }

          return new Response(JSON.stringify({
            success: true,
            status: isConnected ? 'connected' : 'connecting',
            phone_number: account.phone_number,
            qr_code,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (apiErr) {
          console.log('Evolution API status check failed:', apiErr.message);
          return new Response(JSON.stringify({
            success: true,
            status: account.status,
            error_detail: 'Não foi possível verificar o status na Evolution API.',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      case 'disconnect': {
        const { data: account } = await supabase
          .from('whatsapp_accounts')
          .select('*')
          .eq('agency_id', agency_id)
          .single();

        if (account) {
          const effectiveUrl = account.api_url || apiUrl;
          const effectiveKey = account.api_key || apiKey;

          try {
            await fetch(`${effectiveUrl}/instance/logout/${account.instance_name}`, {
              method: 'DELETE',
              headers: { 'apikey': effectiveKey },
            });
          } catch (e) {
            console.log('Logout error (non-critical):', e.message);
          }

          await supabase
            .from('whatsapp_accounts')
            .update({ status: 'disconnected', qr_code: null, phone_number: null })
            .eq('id', account.id);
        }

        return new Response(JSON.stringify({ success: true, status: 'disconnected' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'refresh_qr': {
        const { data: account } = await supabase
          .from('whatsapp_accounts')
          .select('*')
          .eq('agency_id', agency_id)
          .single();

        if (!account) throw new Error('No WhatsApp account found');

        const effectiveUrl = account.api_url || apiUrl;
        const effectiveKey = account.api_key || apiKey;

        const qrRes = await fetch(
          `${effectiveUrl}/instance/connect/${account.instance_name}`,
          { headers: { 'apikey': effectiveKey } }
        );
        const qrData = await qrRes.json();

        if (qrData.base64) {
          await supabase
            .from('whatsapp_accounts')
            .update({ qr_code: qrData.base64 })
            .eq('id', account.id);

          return new Response(JSON.stringify({
            success: true,
            qr_code: qrData.base64,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Already connected
        await supabase
          .from('whatsapp_accounts')
          .update({ status: 'connected', qr_code: null })
          .eq('id', account.id);

        return new Response(JSON.stringify({
          success: true,
          status: 'connected',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'check_webhook': {
        const { data: account } = await supabase
          .from('whatsapp_accounts')
          .select('*')
          .eq('agency_id', agency_id)
          .single();

        if (!account) throw new Error('No WhatsApp account found');

        const effectiveUrl = account.api_url || apiUrl;
        const effectiveKey = account.api_key || apiKey;
        const expectedUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`;

        try {
          const findRes = await fetch(
            `${effectiveUrl}/webhook/find/${account.instance_name}`,
            { headers: { 'apikey': effectiveKey } }
          );
          const findData = await findRes.json();

          const currentUrl = findData?.url || findData?.webhook?.url || null;
          const isEnabled = findData?.enabled ?? findData?.webhook?.enabled ?? false;
          const needsReconfigure = !currentUrl || currentUrl !== expectedUrl || !isEnabled;

          if (needsReconfigure) {
            const result = await configureWebhook(effectiveUrl, effectiveKey, account.instance_name);
            return new Response(JSON.stringify({
              success: true,
              action: 'reconfigured',
              webhook_result: result,
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          return new Response(JSON.stringify({
            success: true,
            action: 'already_configured',
            webhook_url: currentUrl,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (e) {
          console.error('[whatsapp-connect] Webhook check failed:', e.message);
          const result = await configureWebhook(effectiveUrl, effectiveKey, account.instance_name);
          return new Response(JSON.stringify({
            success: true,
            action: 'force_reconfigured',
            webhook_result: result,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('whatsapp-connect error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
