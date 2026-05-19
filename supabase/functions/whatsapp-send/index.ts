import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { phoneVariants } from "../_shared/phone.ts";
import { assertAgencyAccess, HttpError } from "../_shared/auth.ts";

// Normalize phone to digits-only with Brazil country code 55.
function normalizeBrazilPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const clean = digits.startsWith('0') ? digits.slice(1) : digits;
  if (clean.length <= 11) return '55' + clean;
  return clean;
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

    const { account_id, phone_number, message, conversation_id, lead_id } = await req.json();

    if (!account_id || !phone_number || !message) {
      throw new Error('Missing required fields: account_id, phone_number, message');
    }

    // Get account details
    const { data: account, error: accError } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('id', account_id)
      .single();

    if (accError || !account) throw new Error('WhatsApp account not found');
    if (account.status !== 'connected') throw new Error('WhatsApp not connected');

    await assertAgencyAccess(req, supabase, account.agency_id);

    const apiUrl = (Deno.env.get('UAZAPI_SERVER_URL') || '').replace(/\/$/, '');
    const instanceToken = account.api_key; // Stored instance token

    if (!apiUrl || !instanceToken) {
      throw new Error('Uazapi API not configured or instance token missing');
    }

    const formattedPhone = normalizeBrazilPhone(phone_number);

    // Ensure conversation exists
    let convId = conversation_id;
    if (!convId) {
      const variations = phoneVariants(formattedPhone);
      const { data: existingConv } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('account_id', account_id)
        .in('phone_number', variations)
        .limit(1)
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            account_id,
            phone_number: formattedPhone,
            lead_id: lead_id || null,
          })
          .select()
          .single();

        if (convError) throw convError;
        convId = newConv.id;
      }
    }

    // Send via Uazapi - normalize to digits with country code 55
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

    const sendData = await readJson(sendRes) as UazapiSendResponse | null;
    console.log('[whatsapp-send] Uazapi response:', {
      status: sendRes.status,
      ok: sendRes.ok,
      body: sendData,
    });

    if (!sendRes.ok) {
      throw new HttpError(502, `Uazapi API send error: ${JSON.stringify(sendData)}`);
    }

    // Save message BEFORE webhook arrives
    const messageId = sendData?.message?.id || sendData?.id || crypto.randomUUID();

    await supabase
      .from('whatsapp_messages')
      .upsert({
        account_id,
        message_id: messageId,
        conversation_id: convId,
        phone_number: formattedPhone,
        content: message,
        message_type: 'text',
        is_from_me: true,
        status: 'sent',
      }, { onConflict: 'account_id,message_id' });

    // Update conversation
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_is_from_me: true,
      })
      .eq('id', convId);

    console.log('[whatsapp-send] Message sent', {
      account_id,
      phone_number: formattedPhone,
      message_id: messageId,
      conversation_id: convId,
    });

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
