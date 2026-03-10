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

    // Use centralized secrets as fallback
    const effectiveUrl = (account.api_url || Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '');
    const effectiveKey = account.api_key || Deno.env.get('EVOLUTION_API_KEY') || '';

    if (!effectiveUrl || !effectiveKey) {
      throw new Error('Evolution API not configured');
    }

    // Ensure conversation exists
    let convId = conversation_id;
    if (!convId) {
      const { data: existingConv } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('account_id', account_id)
        .eq('phone_number', phone_number)
        .maybeSingle();

      if (existingConv) {
        convId = existingConv.id;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            account_id,
            phone_number,
            lead_id: lead_id || null,
          })
          .select()
          .single();

        if (convError) throw convError;
        convId = newConv.id;
      }
    }

    // Send via Evolution API
    const formattedPhone = phone_number.replace(/\D/g, '');
    const sendRes = await fetch(`${effectiveUrl}/message/sendText/${account.instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': effectiveKey,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    const sendData = await sendRes.json();

    if (!sendRes.ok) {
      throw new Error(`Evolution API send error: ${JSON.stringify(sendData)}`);
    }

    // Save message BEFORE webhook arrives (idempotency)
    const messageId = sendData?.key?.id || crypto.randomUUID();

    await supabase
      .from('whatsapp_messages')
      .upsert({
        account_id,
        message_id: messageId,
        conversation_id: convId,
        phone_number,
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
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
