import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getUazapiConfig() {
  const apiUrl = (Deno.env.get('UAZAPI_SERVER_URL') || '').replace(/\/$/, '');
  const adminToken = Deno.env.get('UAZAPI_ADMIN_TOKEN') || '';
  if (!apiUrl || !adminToken) throw new Error('Uazapi API not configured (missing UAZAPI_SERVER_URL or UAZAPI_ADMIN_TOKEN)');
  return { apiUrl, adminToken };
}

function generateInstanceName(agencyId: string, purpose: string): string {
  // Keeping purpose to allow multiple instances (e.g. general vs billing) while following requested prefix
  return `orbity_agency_${agencyId.substring(0, 8)}_${purpose}`;
}

async function configureWebhook(apiUrl: string, instanceToken: string, agencyId: string) {
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook?agency_id=${agencyId}`;
  
  const payload = {
    enabled: true,
    url: webhookUrl,
    events: [
      'messages',
      'messages_update',
      'connection'
    ],
    excludeMessages: ["wasSentByApi"]
  };

  console.log('[whatsapp-connect] Webhook configuration for agency:', agencyId);

  try {
    const res = await fetch(`${apiUrl}/webhook`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'token': instanceToken 
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log('[whatsapp-connect] Webhook response:', data);
    return { success: res.ok, data };
  } catch (e) {
    console.error('[whatsapp-connect] Webhook configuration failed:', (e as Error).message);
    return { success: false, error: (e as Error).message };
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

    const { action, agency_id, purpose: rawPurpose } = await req.json();
    const purpose = rawPurpose || 'general';

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

    const { apiUrl, adminToken } = getUazapiConfig();

    switch (action) {
      case 'connect': {
        const instanceName = generateInstanceName(agency_id, purpose);

        // 1. Create instance on Uazapi
        let instanceToken = '';
        try {
          const createRes = await fetch(`${apiUrl}/instance/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'admintoken': adminToken,
            },
            body: JSON.stringify({ 
              name: instanceName,
              instanceName: instanceName,
              Name: instanceName
            }),
          });

          const createData = await createRes.json();
          console.log('[whatsapp-connect] Instance create response:', createData);

          if (!createRes.ok && createRes.status !== 409) {
            throw new Error(`Uazapi API error: ${JSON.stringify(createData)}`);
          }
          
          instanceToken = createData.token || createData.instance?.token;
          
          // If instance already exists, we might need to fetch the token if not returned
          if (!instanceToken && createRes.status === 409) {
             const listRes = await fetch(`${apiUrl}/instance/list`, {
               headers: { 'admintoken': adminToken }
             });
             const listData = await listRes.json();
             const existing = listData.find((inst: any) => 
               inst.name === instanceName || 
               inst.instanceName === instanceName || 
               inst.Name === instanceName
             );
             instanceToken = existing?.token;
          }
        } catch (e) {
          console.error('[whatsapp-connect] Instance create failed:', (e as Error).message);
          throw e;
        }

        if (!instanceToken) throw new Error('Failed to obtain instance token from Uazapi');

        // 2. Save account info
        const { data: account, error: upsertError } = await supabase
          .from('whatsapp_accounts')
          .upsert({
            agency_id,
            instance_name: instanceName,
            api_url: apiUrl,
            api_key: instanceToken, // Storing instance token here as requested
            status: 'connecting',
            purpose,
          }, { onConflict: 'agency_id,purpose' })
          .select()
          .single();

        if (upsertError) throw upsertError;

        // 3. Configure webhook
        await configureWebhook(apiUrl, instanceToken, agency_id);

        // 4. Get QR code
        const connectRes = await fetch(`${apiUrl}/instance/connect`, {
          method: 'GET',
          headers: { 'token': instanceToken },
        });

        const connectData = await connectRes.json();
        console.log('[whatsapp-connect] Connect response:', connectData);

        if (connectData.base64) {
          await supabase
            .from('whatsapp_accounts')
            .update({ qr_code: connectData.base64, status: 'connecting' })
            .eq('id', account.id);

          return new Response(JSON.stringify({
            success: true,
            qr_code: connectData.base64,
            status: 'connecting',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Already connected
        if (connectData.status === 'connected' || connectData.message === 'Instance already connected') {
          await supabase
            .from('whatsapp_accounts')
            .update({ status: 'connected', qr_code: null })
            .eq('id', account.id);

          return new Response(JSON.stringify({
            success: true,
            status: 'connected',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({
          success: true,
          status: 'connecting',
          message: connectData.message
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'status': {
        const { data: account } = await supabase
          .from('whatsapp_accounts')
          .select('*')
          .eq('agency_id', agency_id)
          .eq('purpose', purpose)
          .single();

        if (!account) {
          return new Response(JSON.stringify({ success: true, status: 'disconnected' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const instanceToken = account.api_key;
        if (!instanceToken) throw new Error('No instance token found for account');

        try {
          const statusRes = await fetch(`${apiUrl}/instance/status`, { 
            headers: { 'token': instanceToken } 
          });
          const statusData = await statusRes.json();
          console.log('[whatsapp-connect] Status response:', statusData);

          const isConnected = statusData?.status === 'connected';
          const newStatus = isConnected ? 'connected' : 'disconnected';

          let connectedPhone: string | null = account.phone_number;
          if (isConnected && !connectedPhone) {
            const rawJid = statusData?.instance?.wuid || statusData?.instance?.phone;
            if (rawJid) {
              connectedPhone = String(rawJid).split('@')[0].replace(/\D/g, '');
            }
          }

          if (account.status !== newStatus || (isConnected && connectedPhone && connectedPhone !== account.phone_number)) {
            const updatePayload: Record<string, any> = {
              status: newStatus,
              qr_code: isConnected ? null : account.qr_code,
            };
            if (isConnected && connectedPhone) updatePayload.phone_number = connectedPhone;

            await supabase
              .from('whatsapp_accounts')
              .update(updatePayload)
              .eq('id', account.id);
          }

          // If disconnected, try to get new QR
          let qr_code = null;
          if (!isConnected) {
            try {
              const qrRes = await fetch(`${apiUrl}/instance/connect`, {
                method: 'GET',
                headers: { 'token': instanceToken }
              });
              const qrData = await qrRes.json();
              if (qrData.base64) {
                qr_code = qrData.base64;
                await supabase
                  .from('whatsapp_accounts')
                  .update({ qr_code: qrData.base64, status: 'connecting' })
                  .eq('id', account.id);
              }
            } catch (qrErr) {
              console.log('QR fetch error:', (qrErr as Error).message);
            }
          }

          return new Response(JSON.stringify({
            success: true,
            status: isConnected ? 'connected' : 'connecting',
            phone_number: connectedPhone,
            qr_code,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (apiErr) {
          console.error('Uazapi status check failed:', (apiErr as Error).message);
          return new Response(JSON.stringify({
            success: true,
            status: account.status,
            error_detail: 'Não foi possível verificar o status na Uazapi.',
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      case 'disconnect': {
        const { data: account } = await supabase
          .from('whatsapp_accounts')
          .select('*')
          .eq('agency_id', agency_id)
          .eq('purpose', purpose)
          .single();

        if (account && account.api_key) {
          try {
            await fetch(`${apiUrl}/instance/logout`, {
              method: 'POST',
              headers: { 'token': account.api_key },
              body: JSON.stringify({ 
                instanceName: account.instance_name,
                name: account.instance_name,
                Name: account.instance_name
              }),
            });
          } catch (e) {
            console.log('Logout error (non-critical):', (e as Error).message);
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
          .eq('purpose', purpose)
          .single();

        if (!account || !account.api_key) throw new Error('No valid WhatsApp account found');

        const qrRes = await fetch(`${apiUrl}/instance/connect`, {
          method: 'GET',
          headers: { 'token': account.api_key }
        });
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

        return new Response(JSON.stringify({
          success: true,
          status: qrData.status || 'unknown',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'check_webhook': {
        const { data: account } = await supabase
          .from('whatsapp_accounts')
          .select('*')
          .eq('agency_id', agency_id)
          .eq('purpose', purpose)
          .single();

        if (!account || !account.api_key) throw new Error('No valid WhatsApp account found');

        const result = await configureWebhook(apiUrl, account.api_key, agency_id);
        return new Response(JSON.stringify({
          success: true,
          action: 'reconfigured',
          webhook_result: result,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('whatsapp-connect error:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
