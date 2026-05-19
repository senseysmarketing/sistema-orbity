import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function formatPhoneNumber(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length <= 11) digits = '55' + digits;
  return digits;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { agency_id, phone_number, message, account_id } = await req.json();

    if (!phone_number || !message) throw new Error('Missing phone_number or message');

    let instanceToken;
    let apiUrl = Deno.env.get('UAZAPI_SERVER_URL')?.replace(/\/$/, '');

    // Isolation: Get token from agency_integrations
    const { data: integ } = await supabase
      .from('agency_integrations')
      .select('credentials')
      .eq('agency_id', agency_id)
      .maybeSingle();

    instanceToken = (integ?.credentials as any)?.instance_token;

    // Fallback to whatsapp_accounts if not in integrations
    if (!instanceToken) {
      const { data: acc } = await supabase
        .from('whatsapp_accounts')
        .select('api_key')
        .eq('agency_id', agency_id)
        .eq('status', 'connected')
        .maybeSingle();
      instanceToken = acc?.api_key;
    }

    if (!instanceToken) throw new Error('No WhatsApp instance found for this agency');

    const formattedPhone = formatPhoneNumber(phone_number);

    console.log(`[whatsapp-send] Sending to ${formattedPhone} for agency ${agency_id}`);

    // Strict Uazapi payload
    const sendRes = await fetch(`${apiUrl}/message/sendText`, {
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
    if (!sendRes.ok) throw new Error(`Uazapi error: ${JSON.stringify(sendData)}`);

    return new Response(JSON.stringify({ success: true, data: sendData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[whatsapp-send] Error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
