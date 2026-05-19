import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { phoneVariants } from "../_shared/phone.ts";
import { assertAgencyAccess, HttpError } from "../_shared/auth.ts";

// Normalize phone to digits-only with DDI + DDD + Number format.
function formatPhoneNumber(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  
  // Brazil handling: if starts with 0, remove it
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  
  // If too short for country code, assume Brazil 55
  if (digits.length <= 11) {
    digits = '55' + digits;
  }
  
  return digits;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

type UazapiSendResponse = {
  message?: { id?: string };
  id?: string;
  success?: boolean;
};

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

    const { account_id, agency_id, phone_number, message, conversation_id, lead_id } = await req.json();

    if ((!account_id && !agency_id) || !phone_number || !message) {
      throw new Error('Missing required fields: (account_id or agency_id), phone_number, message');
    }

    // Get token and API URL with multi-tenant isolation
    let account;
    if (account_id) {
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('*')
        .eq('id', account_id)
        .single();
      
      if (error || !data) throw new Error('WhatsApp account not found');
      account = data;
    } else {
      // Background resolution via agency_id
      // Prioritize whatsapp_accounts as primary store for now, but check agency_integrations if credentials exist
      const { data: integ } = await supabase
        .from('agency_integrations')
        .select('*')
        .eq('agency_id', agency_id)
        .maybeSingle();

      // Check if credentials JSONB exists in agency_integrations (as per spec)
      const specToken = (integ as any)?.credentials?.instance_token;
      
      if (specToken) {
        account = {
          api_key: specToken,
          api_url: Deno.env.get('UAZAPI_SERVER_URL'),
          agency_id: agency_id,
          status: 'connected'
        };
      } else {
        const { data: acc, error: accError } = await supabase
          .from('whatsapp_accounts')
          .select('*')
          .eq('agency_id', agency_id)
          .eq('status', 'connected')
          .eq('purpose', 'general')
          .maybeSingle();
        
        if (accError || !acc) {
          throw new Error(`No active WhatsApp instance found for agency ${agency_id}`);
        }
        account = acc;
      }
    }

    if (account.status !== 'connected' && account.status !== 'connecting') {
      throw new Error('WhatsApp instance is not connected');
    }

    // Auth check (handles service role correctly)
    await assertAgencyAccess(req, supabase, account.agency_id);

    const apiUrl = (account.api_url || Deno.env.get('UAZAPI_SERVER_URL') || '').replace(/\/$/, '');
    const instanceToken = account.api_key;

    if (!apiUrl || !instanceToken) {
      throw new Error('Uazapi API not configured or instance token missing');
    }

    const formattedPhone = formatPhoneNumber(phone_number);

    // Ensure conversation exists
    let convId = conversation_id;
    if (!convId) {
      const variations = phoneVariants(formattedPhone);
      const { data: existingConv } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('account_id', account.id)
        .in('phone_number', variations)
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            account_id: account.id,
            phone_number: formattedPhone,
            lead_id: lead_id || null,
          })
          .select()
          .single();

        if (convError) {
          console.error('[whatsapp-send] Error creating conversation:', convError);
          // Non-critical, continue without conversation linking if necessary
        } else {
          convId = newConv.id;
        }
      }
    }

    // Send via Uazapi using the strict specification
    console.log(`[whatsapp-send] Sending message to ${formattedPhone} via Uazapi`);
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

    const sendData = await readJson(sendRes) as UazapiSendResponse | null;
    
    if (!sendRes.ok) {
      console.error('[whatsapp-send] Uazapi API error:', sendData);
      throw new HttpError(502, `Uazapi API send error: ${JSON.stringify(sendData)}`);
    }

    // Save message locally
    const messageId = sendData?.message?.id || sendData?.id || crypto.randomUUID();

    if (account.id) {
      await supabase
        .from('whatsapp_messages')
        .upsert({
          account_id: account.id,
          message_id: messageId,
          conversation_id: convId,
          phone_number: formattedPhone,
          content: message,
          message_type: 'text',
          is_from_me: true,
          status: 'sent',
        }, { onConflict: 'account_id,message_id' });

      // Update conversation
      if (convId) {
        await supabase
          .from('whatsapp_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_is_from_me: true,
          })
          .eq('id', convId);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: messageId,
      conversation_id: convId,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[whatsapp-send] Error:', error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: error instanceof HttpError ? error.status : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});