import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { phoneVariants } from "../_shared/phone.ts";
import { assertAgencyAccess, HttpError } from "../_shared/auth.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type UazapiMessage = {
  key?: {
    id?: string;
    fromMe?: boolean;
  };
  id?: string;
  fromMe?: boolean;
  text?: string;
  messageType?: string;
  message?: {
    conversation?: string;
    extendedTextMessage?: { text?: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
    audioMessage?: unknown;
    documentMessage?: { fileName?: string };
  };
  messageTimestamp?: number | string;
  timestamp?: number | string;
};

type SyncedMessage = {
  account_id: string;
  conversation_id: string;
  message_id: string;
  content: string | null;
  is_from_me: boolean;
  message_type: string;
  status: string;
  phone_number: string;
  created_at: string;
};

/**
 * Syncs messages from Uazapi for a specific conversation.
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

    const { data: account, error: accError } = await supabase
      .from('whatsapp_accounts')
      .select('instance_name, api_url, api_key, agency_id')
      .eq('id', account_id)
      .single();

    if (accError || !account) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp account not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await assertAgencyAccess(req, supabase, account.agency_id);

    const digits = phone_number.replace(/\D/g, '');
    let remoteJid = `${digits}@s.whatsapp.net`;
    if (conversation_id) {
      const { data: convRow } = await supabase
        .from('whatsapp_conversations')
        .select('remote_jid')
        .eq('id', conversation_id)
        .maybeSingle();
      if (convRow?.remote_jid) remoteJid = convRow.remote_jid;
    }

    const apiUrl = (Deno.env.get('UAZAPI_SERVER_URL') || account.api_url || '').replace(/\/$/, '');
    const instanceToken = account.api_key;

    if (!apiUrl || !instanceToken) {
      return new Response(
        JSON.stringify({ success: true, synced: 0, reason: 'no_uazapi_config' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Uazapi: POST /message/find
    const findRes = await fetch(`${apiUrl}/message/find`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': instanceToken,
      },
      body: JSON.stringify({
        chatid: remoteJid,
        limit: 50,
      }),
    });

    if (!findRes.ok) {
      const txt = await findRes.text();
      console.error('[sync] Uazapi error:', findRes.status, txt);
      return new Response(
        JSON.stringify({ success: true, synced: 0, error: txt }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const findData = await findRes.json();
    const findPayload = findData as { messages?: UazapiMessage[]; data?: UazapiMessage[] } | UazapiMessage[];
    const messages: UazapiMessage[] = Array.isArray(findPayload)
      ? findPayload
      : (findPayload.messages || findPayload.data || []);
    console.log(`[sync] Got ${messages.length} messages from Uazapi`);

    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let convId = conversation_id;
    if (!convId) {
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
      return new Response(
        JSON.stringify({ success: true, synced: 0, reason: 'no_conversation' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let synced = 0;
    const upsertBatch: SyncedMessage[] = [];

    for (const msg of messages) {
      try {
        const key = msg.key || {};
        const messageId = key.id || msg.id;
        if (!messageId) continue;

        const isFromMe = key.fromMe === true || msg.fromMe === true;
        let content = msg.text || '';
        let messageType = msg.messageType || 'text';
        const messageObj = msg.message || {};

        if (!content) {
          if (messageObj.conversation) { content = messageObj.conversation; messageType = 'text'; }
          else if (messageObj.extendedTextMessage?.text) { content = messageObj.extendedTextMessage.text; messageType = 'text'; }
          else if (messageObj.imageMessage) { content = messageObj.imageMessage.caption || ''; messageType = 'image'; }
          else if (messageObj.videoMessage) { content = messageObj.videoMessage.caption || ''; messageType = 'video'; }
          else if (messageObj.audioMessage) { messageType = 'audio'; }
          else if (messageObj.documentMessage) { content = messageObj.documentMessage.fileName || ''; messageType = 'document'; }
        }

        const timestamp = msg.messageTimestamp
          ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
          : (msg.timestamp ? new Date(msg.timestamp).toISOString() : new Date().toISOString());

        upsertBatch.push({
          account_id,
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
        console.warn('[sync] Failed to parse message:', e);
      }
    }

    if (upsertBatch.length > 0) {
      for (let i = 0; i < upsertBatch.length; i += 50) {
        const chunk = upsertBatch.slice(i, i + 50);
        const { error: upsertError } = await supabase
          .from('whatsapp_messages')
          .upsert(chunk, { onConflict: 'account_id,message_id', ignoreDuplicates: false });
        if (!upsertError) synced += chunk.length;
      }

      const sorted = [...upsertBatch].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latest = sorted[0];
      const latestCustomer = sorted.find((msg) => !msg.is_from_me);
      const updatePayload: Record<string, string | boolean> = {
        last_message_at: latest.created_at,
        last_message_is_from_me: latest.is_from_me,
      };
      if (latestCustomer?.created_at) {
        updatePayload.last_customer_message_at = latestCustomer.created_at;
      }

      await supabase
        .from('whatsapp_conversations')
        .update(updatePayload)
        .eq('id', convId);
    }

    return new Response(
      JSON.stringify({ success: true, synced }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[sync] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: error instanceof HttpError ? error.status : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
