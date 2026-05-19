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
  return `orbity_agency_${agencyId.substring(0, 8)}_${purpose}`;
}

async function configureWebhook(apiUrl: string, instanceToken: string, agencyId: string) {
  const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook?agency_id=${agencyId}`;
  
  const payload = {
    enabled: true,
    url: webhookUrl,
    events: ['messages', 'messages_update', 'connection'],
    excludeMessages: ["wasSentByApi"]
  };

  try {
    const res = await fetch(`${apiUrl}/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'token': instanceToken },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (e) {
    console.error('[whatsapp-connect] Webhook config failed:', e);
    return { success: false, error: e.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization');

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');

    const { action, agency_id, purpose: rawPurpose } = await req.json();
    const purpose = rawPurpose || 'general';

    // Verify user access
    const { data: membership } = await supabase.from('agency_users').select('role').eq('user_id', user.id).eq('agency_id', agency_id).single();
    if (!membership || !['owner', 'admin'].includes(membership.role)) throw new Error('Unauthorized');

    const { apiUrl, adminToken } = getUazapiConfig();

    if (action === 'connect' || action === 'refresh_qr') {
      const instanceName = generateInstanceName(agency_id, purpose);
      
      // Step A: Check agency_integrations for existing token
      const { data: integration } = await supabase
        .from('agency_integrations')
        .select('credentials')
        .eq('agency_id', agency_id)
        .maybeSingle();

      let instanceToken = (integration?.credentials as any)?.instance_token;

      // Step B: Active Validation (Anti-Zombie)
      if (instanceToken) {
        console.log(`[whatsapp-connect] Validating token for agency ${agency_id}`);
        try {
          const infoRes = await fetch(`${apiUrl}/instance/info`, {
            headers: { 'token': instanceToken }
          });
          
          if (!infoRes.ok) {
            console.log(`[whatsapp-connect] Token invalid (status ${infoRes.status}), resetting...`);
            instanceToken = null;
            // Immediate "Reset" in DB
            const updatedCredentials = { ...(integration?.credentials as any || {}) };
            delete updatedCredentials.instance_token;
            await supabase.from('agency_integrations').update({
              credentials: updatedCredentials,
              updated_at: new Date().toISOString()
            }).eq('agency_id', agency_id);
          }
        } catch (e) {
          console.error('[whatsapp-connect] Validation call failed:', e);
          instanceToken = null;
        }
      }

      // Step C: If no token (new or reset), create instance
      if (!instanceToken) {
        console.log(`[whatsapp-connect] Creating new instance for agency ${agency_id}`);
        const createRes = await fetch(`${apiUrl}/instance/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'admintoken': adminToken },
          body: JSON.stringify({ name: instanceName, instanceName: instanceName }),
        });
        const createData = await createRes.json();
        
        if (!createRes.ok && createRes.status !== 409) {
          throw new Error(`Uazapi Create Error: ${JSON.stringify(createData)}`);
        }

        instanceToken = createData.token || createData.instance?.token;

        if (!instanceToken && createRes.status === 409) {
          const listRes = await fetch(`${apiUrl}/instance/list`, { headers: { 'admintoken': adminToken } });
          const listData = await listRes.json();
          const existing = listData.find((inst: any) => inst.name === instanceName || inst.instanceName === instanceName);
          instanceToken = existing?.token;
        }

        if (!instanceToken) throw new Error('Could not obtain instance token');

        // Save token to agency_integrations
        const newCredentials = { ...(integration?.credentials as any || {}), instance_token: instanceToken };
        await supabase.from('agency_integrations').upsert({
          agency_id,
          credentials: newCredentials,
          updated_at: new Date().toISOString()
        });
      }

      // Sync with whatsapp_accounts for legacy/UI compatibility
      await supabase.from('whatsapp_accounts').upsert({
        agency_id,
        instance_name: instanceName,
        api_url: apiUrl,
        api_key: instanceToken,
        status: 'connecting',
        purpose,
      }, { onConflict: 'agency_id,purpose' });

      // Step C: Always get QR/Connect
      await configureWebhook(apiUrl, instanceToken, agency_id);
      const connectRes = await fetch(`${apiUrl}/instance/connect`, {
        method: 'GET',
        headers: { 'token': instanceToken },
      });
      const connectData = await connectRes.json();
      const qrCode = connectData.base64 || connectData.qr_code || connectData.qrcode || connectData.instance?.qrcode;

      return new Response(JSON.stringify({
        success: true,
        qr_code: qrCode,
        status: connectData.status || (qrCode ? 'connecting' : 'disconnected'),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Pass through other actions (status, disconnect, etc) but following same token logic if needed
    // For brevity and focus on the user's critical path:
    if (action === 'status') {
       const { data: acc } = await supabase.from('whatsapp_accounts').select('api_key').eq('agency_id', agency_id).eq('purpose', purpose).single();
       if (!acc?.api_key) return new Response(JSON.stringify({ success: true, status: 'disconnected' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
       
       let infoRes;
       try {
         infoRes = await fetch(`${apiUrl}/instance/info`, { headers: { 'token': acc.api_key } });
       } catch (e) {
         console.error('[whatsapp-connect] Status info call failed:', e);
         return new Response(JSON.stringify({ success: false, error: 'Could not connect to Uazapi' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
       }

       // Anti-Zombie Reset for Status check
       if (!infoRes.ok && (infoRes.status === 401 || infoRes.status === 404)) {
         console.log(`[whatsapp-connect] Token invalid on status check (${infoRes.status}), resetting...`);
         
         // Clear in agency_integrations
         const { data: integration } = await supabase.from('agency_integrations').select('credentials').eq('agency_id', agency_id).maybeSingle();
         const updatedCredentials = { ...(integration?.credentials as any || {}) };
         delete updatedCredentials.instance_token;
         await supabase.from('agency_integrations').update({ credentials: updatedCredentials }).eq('agency_id', agency_id);
         
         // Update account
         await supabase.from('whatsapp_accounts').update({ status: 'disconnected', api_key: null, qr_code: null }).eq('agency_id', agency_id).eq('purpose', purpose);
         
         return new Response(JSON.stringify({ success: true, status: 'disconnected', reset: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
       }

       const data = await infoRes.json();
       const rawStatus = data?.status || data?.instance?.status || 'disconnected';
       const isConnected = rawStatus === 'connected';
       const newStatus = isConnected ? 'connected' : (['connecting', 'qr', 'OPENING'].includes(rawStatus) ? 'connecting' : 'disconnected');
       
       let qr_code = null;
       if (!isConnected) {
         const qrRes = await fetch(`${apiUrl}/instance/connect`, { headers: { 'token': acc.api_key } });
         if (qrRes.ok) {
           const qrData = await qrRes.json();
           qr_code = qrData.base64 || qrData.qr_code || qrData.qrcode;
         }
       }

       // Update DB status if changed
       if (newStatus) {
         await supabase.from('whatsapp_accounts').update({ 
           status: newStatus, 
           qr_code: qr_code,
           phone_number: data?.instance?.owner || data?.owner || null
         }).eq('agency_id', agency_id).eq('purpose', purpose);
       }

       return new Response(JSON.stringify({ 
         success: true, 
         status: newStatus, 
         qr_code,
         phone_number: data?.instance?.owner || data?.owner || null 
       }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'disconnect') {
       const { data: acc } = await supabase.from('whatsapp_accounts').select('api_key, instance_name').eq('agency_id', agency_id).eq('purpose', purpose).single();
       if (acc?.api_key) {
         await fetch(`${apiUrl}/instance/logout`, { method: 'POST', headers: { 'token': acc.api_key }, body: JSON.stringify({ instanceName: acc.instance_name }) }).catch(() => {});
         await supabase.from('whatsapp_accounts').update({ status: 'disconnected', qr_code: null }).eq('agency_id', agency_id).eq('purpose', purpose);
       }
       return new Response(JSON.stringify({ success: true, status: 'disconnected' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unsupported action: ${action}`);

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
