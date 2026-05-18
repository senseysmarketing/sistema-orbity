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

function normalizeBrazilPhone(phone: string): string {
  // Remove tudo que não é dígito
  let digits = phone.replace(/\D/g, '');
  
  // Remove o zero à esquerda se existir
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Se não tem DDI (55), adiciona
  if (digits.length <= 11 && !digits.startsWith('55')) {
    digits = '55' + digits;
  }

  // Regra específica: DDI + DDD + número sem o 9 (para números de 13 dígitos como 5511988887777)
  // Alguns provedores preferem 12 dígitos (removendo o 9 extra do Brasil)
  if (digits.length === 13 && digits.startsWith('55')) {
    // 55 (0,1) + DD (2,3) + 9 (4) + rest (5-12)
    // Retorna 55 + DD + rest
    return digits.slice(0, 4) + digits.slice(5);
  }

  return digits;
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
    const isServiceRole = authHeader?.includes(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || 'never-match');
    
    let user = null;
    if (authHeader && !isServiceRole) {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (authError) throw authError;
      user = authUser;
    }

    // Check if user is master (if not service role)
    let isMaster = isServiceRole;
    if (user && !isMaster) {
      // Check if user is in master_users table
      const { data: masterUser } = await supabase
        .from('master_users')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (masterUser) {
        isMaster = true;
      } else {
        // Fallback: Check if user is owner/admin of the MASTER_AGENCY_ID
        const MASTER_AGENCY_ID = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0';
        const { data: agencyUser } = await supabase
          .from('agency_users')
          .select('role')
          .eq('agency_id', MASTER_AGENCY_ID)
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (agencyUser && (agencyUser.role === 'owner' || agencyUser.role === 'admin')) {
          isMaster = true;
        }
      }
    }

    const { action, phone, message } = await req.json();

    // Only master users (or service role) can connect/status.
    if (!isMaster && (action === 'connect' || action === 'status')) {
      throw new Error('Unauthorized: master access required');
    }
    
    // For send_message, we allow it to be called for onboarding verification
    // In a production environment, we should add rate limiting or more checks here.
    if (action === 'send_message') {
       // Proceed to send_message
    } else if (!isMaster) {
       throw new Error('Unauthorized');
    }

    console.log(`[master-whatsapp] Action: ${action}, isMaster: ${isMaster}, user: ${user?.id}`);

    const { apiUrl, adminToken } = getUazapiConfig();
    const SETTING_KEY = 'master_whatsapp_instance';

    switch (action) {
      case 'connect': {
        const instanceName = "orbity_master_official";

        // 1. Create instance
        console.log(`[master-whatsapp] Creating instance: ${instanceName} at ${apiUrl}`);
        const createRes = await fetch(`${apiUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': adminToken,
            'admintoken': adminToken,
          },
          body: JSON.stringify({ 
            instanceName,
            name: instanceName,
            Name: instanceName
          }),
        });

        const createData = await createRes.json();
        console.log('[master-whatsapp] Instance create response:', createData);

        let instanceToken = createData.token || createData.instance?.token;

        if (!createRes.ok && createRes.status !== 409) {
          throw new Error(`Uazapi API error: ${JSON.stringify(createData)}`);
        }

        // If instance already exists, fetch token
        if (!instanceToken && createRes.status === 409) {
          const listRes = await fetch(`${apiUrl}/instance/list`, {
            headers: { 
              'apikey': adminToken,
              'admintoken': adminToken 
            }
          });
          const listData = await listRes.json();
          const existing = listData.find((inst: any) => inst.name === instanceName);
          instanceToken = existing?.token;
        }

        if (!instanceToken) throw new Error('Failed to obtain instance token');

        // 2. Save to system_settings
        const { error: upsertError } = await supabase
          .from('system_settings')
          .upsert({
            key: SETTING_KEY,
            value: {
              instance_name: instanceName,
              token: instanceToken,
              status: 'connecting',
              updated_at: new Date().toISOString()
            }
          });

        if (upsertError) throw upsertError;

        // 3. Get QR Code
        const connectRes = await fetch(`${apiUrl}/instance/connect`, {
          method: 'POST',
          headers: { 'token': instanceToken },
        });

        const connectData = await connectRes.json();
        console.log('[master-whatsapp] Connect response:', connectData);

        return new Response(JSON.stringify({
          success: true,
          qr_code: connectData.base64,
          status: connectData.status || 'connecting',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'status': {
        const { data: setting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', SETTING_KEY)
          .single();

        if (!setting?.value?.token) {
          return new Response(JSON.stringify({ success: true, status: 'disconnected' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const instanceToken = setting.value.token;
        const statusRes = await fetch(`${apiUrl}/instance/status`, { 
          headers: { 'token': instanceToken } 
        });
        const statusData = await statusRes.json();
        
        const isConnected = statusData?.status === 'connected';
        
        // Update status in settings if changed
        if (isConnected && setting.value.status !== 'connected') {
          await supabase
            .from('system_settings')
            .update({
              value: { ...setting.value, status: 'connected' }
            })
            .eq('key', SETTING_KEY);
        }

        return new Response(JSON.stringify({
          success: true,
          status: statusData?.status || 'disconnected',
          instance: statusData?.instance
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'send_message': {
        if (!phone || !message) throw new Error('Missing phone or message');

        const { data: setting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', SETTING_KEY)
          .single();

        if (!setting?.value?.token) throw new Error('Master WhatsApp instance not configured');

        const instanceToken = setting.value.token;
        const formattedPhone = normalizeBrazilPhone(phone);

        const sendRes = await fetch(`${apiUrl}/send/text`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'token': instanceToken,
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: message,
          }),
        });

        const sendData = await sendRes.json();
        if (!sendRes.ok) throw new Error(`Uazapi send error: ${JSON.stringify(sendData)}`);

        return new Response(JSON.stringify({ success: true, data: sendData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[master-whatsapp] Error:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});