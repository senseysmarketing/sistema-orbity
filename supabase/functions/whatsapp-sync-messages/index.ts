import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { phoneVariants } from "../_shared/phone.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Syncs messages from Evolution API for a specific conversation.
 * Called on-demand when the WhatsApp chat modal opens.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { account_id, phone_number, conversation_id } = await req.json();

    if (!account_id || !phone_number) {
      return new Response(
        JSON.stringify({ error: 'account_id and phone_number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get WhatsApp account details
    const { data: account, error: accError } = await supabase
      .from('whatsapp_accounts')
      .select('instance_name, api_url, api_key')
      .eq('id', account_id)
      .single();

    if (accError || !account) {
      console.error('Account not found:', accError);
      return new Response(
        JSON.stringify({ error: 'WhatsApp account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone to digits only
    const digits = phone_number.replace(/\D/g, '');
    const remoteJid = `${digits}@s.whatsapp.net`;

    console.log(`[sync] Fetching messages for ${remoteJid} from instance ${account.instance_name}`);

    // Call Evolution API to fetch messages
    const apiUrl = account.api_url.replace(/\/$/, '');
    const findUrl = `${apiUrl}/chat/findMessages/${account.instance_name}`;

    const evoResponse = await fetch(findUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': account.api_key,
      },
      body: JSON.stringify({
        where: {
          key: {
            remoteJid: remoteJid,
          },
        },
        limit: 50,
      }),
    });

    if (!evoResponse.ok) {
      const errorText = await evoResponse.text();
      console.error(`[sync] Evolution API error ${evoResponse.status}:`, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch messages from Evolution API', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const evoData = await evoResponse.json();
    
    // Log response structure for debugging
    const responseType = Array.isArray(evoData) ? 'array' : typeof evoData;
    const topKeys = evoData && typeof evoData === 'object' && !Array.isArray(evoData) ? Object.keys(evoData) : [];
    console.log(`[sync] Response type: ${responseType}, keys: ${JSON.stringify(topKeys)}`);

    // Handle various Evolution API response formats
    let messages: any[] = [];
    if (Array.isArray(evoData)) {
      messages = evoData;
    } else if (evoData && typeof evoData === 'object') {
      messages = evoData.messages || evoData.data || evoData.records || [];
      // If still not an array, check if the response itself contains message-like data
      if (!Array.isArray(messages)) {
        messages = [];
      }
    }

    console.log(`[sync] Got ${messages.length} messages from Evolution API`);

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure conversation exists
    let convId = conversation_id;
    if (!convId) {
      // Elastic search: handle Brazilian 9th-digit variations
      const variations = phoneVariants(digits);
      const { data: conv } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('account_id', account_id)
        .in('phone_number', variations)
        .limit(1)
        .maybeSingle();

      convId = conv?.id;
    }

    if (!convId) {
      console.log(`[sync] No conversation found for ${digits}, skipping sync`);
      return new Response(
        JSON.stringify({ success: true, synced: 0, reason: 'no_conversation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and upsert messages
    let synced = 0;
    const upsertBatch: any[] = [];

    for (const msg of messages) {
      try {
        // Evolution API v2 message structure
        const key = msg.key || {};
        const messageId = key.id;
        if (!messageId) continue;

        const isFromMe = key.fromMe === true;

        // Extract message content
        let content = '';
        let messageType = 'text';
        const messageObj = msg.message || {};

        if (messageObj.conversation) {
          content = messageObj.conversation;
          messageType = 'text';
        } else if (messageObj.extendedTextMessage?.text) {
          content = messageObj.extendedTextMessage.text;
          messageType = 'text';
        } else if (messageObj.imageMessage) {
          content = messageObj.imageMessage.caption || '';
          messageType = 'image';
        } else if (messageObj.videoMessage) {
          content = messageObj.videoMessage.caption || '';
          messageType = 'video';
        } else if (messageObj.audioMessage) {
          content = '';
          messageType = 'audio';
        } else if (messageObj.documentMessage) {
          content = messageObj.documentMessage.fileName || '';
          messageType = 'document';
        } else if (messageObj.stickerMessage) {
          content = '';
          messageType = 'sticker';
        } else if (messageObj.contactMessage) {
          content = messageObj.contactMessage.displayName || '';
          messageType = 'contact';
        } else if (messageObj.locationMessage) {
          content = `📍 ${messageObj.locationMessage.degreesLatitude}, ${messageObj.locationMessage.degreesLongitude}`;
          messageType = 'location';
        } else {
          // Unknown type, try to get any text
          const keys = Object.keys(messageObj);
          if (keys.length > 0) {
            messageType = keys[0].replace('Message', '');
          }
        }

        // Get timestamp — Evolution API returns messageTimestamp as unix seconds
        const timestamp = msg.messageTimestamp
          ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString();

        upsertBatch.push({
          account_id: account_id,
          conversation_id: convId,
          message_id: messageId,
          content: content || null,
          is_from_me: isFromMe,
          message_type: messageType,
          status: 'delivered',
          phone_number: digits,
          created_at: timestamp,
        });
      } catch (e) {
        console.warn(`[sync] Failed to parse message:`, e);
      }
    }

    if (upsertBatch.length > 0) {
      // Upsert in chunks of 50
      for (let i = 0; i < upsertBatch.length; i += 50) {
        const chunk = upsertBatch.slice(i, i + 50);
        const { error: upsertError } = await supabase
          .from('whatsapp_messages')
          .upsert(chunk, {
            onConflict: 'account_id,message_id',
            ignoreDuplicates: false,
          });

        if (upsertError) {
          console.error(`[sync] Upsert error:`, upsertError);
        } else {
          synced += chunk.length;
        }
      }
    }

    console.log(`[sync] Successfully synced ${synced} messages for conversation ${convId}`);

    return new Response(
      JSON.stringify({ success: true, synced }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[sync] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
