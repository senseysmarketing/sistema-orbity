import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const { action, agency_id, instance_name, api_url, api_key } = await req.json();

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

    switch (action) {
      case 'connect': {
        // Save account info
        const { data: account, error: upsertError } = await supabase
          .from('whatsapp_accounts')
          .upsert({
            agency_id,
            instance_name,
            api_url: api_url.replace(/\/$/, ''),
            api_key,
            status: 'connecting',
          }, { onConflict: 'agency_id' })
          .select()
          .single();

        if (upsertError) throw upsertError;

        // Create instance on Evolution API
        try {
          const createRes = await fetch(`${api_url.replace(/\/$/, '')}/instance/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': api_key,
            },
            body: JSON.stringify({
              instanceName: instance_name,
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

        // Get QR code
        const qrRes = await fetch(`${api_url.replace(/\/$/, '')}/instance/connect/${instance_name}`, {
          method: 'GET',
          headers: { 'apikey': api_key },
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

        // Check status on Evolution API
        try {
          const statusRes = await fetch(
            `${account.api_url}/instance/connectionState/${account.instance_name}`,
            { headers: { 'apikey': account.api_key } }
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

          // If disconnected, auto-fetch new QR code
          let qr_code = null;
          if (!isConnected) {
            try {
              const qrRes = await fetch(
                `${account.api_url}/instance/connect/${account.instance_name}`,
                { headers: { 'apikey': account.api_key } }
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
            error_detail: 'Não foi possível verificar o status na Evolution API. Verifique a URL e API Key.',
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
          try {
            await fetch(`${account.api_url}/instance/logout/${account.instance_name}`, {
              method: 'DELETE',
              headers: { 'apikey': account.api_key },
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

        const qrRes = await fetch(
          `${account.api_url}/instance/connect/${account.instance_name}`,
          { headers: { 'apikey': account.api_key } }
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
