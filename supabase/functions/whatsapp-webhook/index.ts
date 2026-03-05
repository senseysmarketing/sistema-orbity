import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { event, instance, data } = body;

    console.log('[whatsapp-webhook] Event received:', event, 'instance:', instance);

    if (!instance) {
      return new Response(JSON.stringify({ success: true, skipped: 'no instance' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find account by instance name
    const { data: account } = await supabase
      .from('whatsapp_accounts')
      .select('id, agency_id')
      .eq('instance_name', instance)
      .maybeSingle();

    if (!account) {
      console.log('[whatsapp-webhook] Unknown instance:', instance);
      return new Response(JSON.stringify({ success: true, skipped: 'unknown instance' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle connection status updates
    if (event === 'connection.update') {
      const state = data?.state;
      const newStatus = state === 'open' ? 'connected' : state === 'close' ? 'disconnected' : 'connecting';

      await supabase
        .from('whatsapp_accounts')
        .update({
          status: newStatus,
          qr_code: newStatus === 'connected' ? null : undefined,
        })
        .eq('id', account.id);

      console.log('[whatsapp-webhook] Connection status updated:', newStatus);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle messages
    if (event === 'messages.upsert' || event === 'messages.update') {
      const messageData = data?.message || data;
      if (!messageData) {
        return new Response(JSON.stringify({ success: true, skipped: 'no message data' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const key = messageData.key || data.key;
      const messageId = key?.id || crypto.randomUUID();
      const isFromMe = key?.fromMe || false;
      const remoteJid = key?.remoteJid || '';
      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');

      // Skip group messages and status updates
      if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') {
        return new Response(JSON.stringify({ success: true, skipped: 'group or status' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const content = messageData.message?.conversation ||
        messageData.message?.extendedTextMessage?.text ||
        messageData.message?.imageMessage?.caption ||
        messageData.message?.videoMessage?.caption ||
        '';

      const messageType = messageData.message?.imageMessage ? 'image' :
        messageData.message?.videoMessage ? 'video' :
        messageData.message?.audioMessage ? 'audio' :
        messageData.message?.documentMessage ? 'document' :
        'text';

      // Find or create conversation
      let { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('id, lead_id')
        .eq('account_id', account.id)
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (!conversation) {
        // Try to match with a lead by phone
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('agency_id', account.agency_id)
          .eq('phone', phoneNumber)
          .maybeSingle();

        const { data: newConv } = await supabase
          .from('whatsapp_conversations')
          .insert({
            account_id: account.id,
            phone_number: phoneNumber,
            lead_id: lead?.id || null,
          })
          .select()
          .single();

        conversation = newConv;
      }

      if (!conversation) {
        throw new Error('Failed to create conversation');
      }

      const timestamp = new Date().toISOString();

      // Idempotent insert via upsert
      await supabase
        .from('whatsapp_messages')
        .upsert({
          account_id: account.id,
          message_id: messageId,
          conversation_id: conversation.id,
          phone_number: phoneNumber,
          message_type: messageType,
          content,
          is_from_me: isFromMe,
          status: event === 'messages.update' ? (data.status || 'delivered') : 'received',
        }, { onConflict: 'account_id,message_id' });

      // Update conversation timestamps
      const updateData: Record<string, any> = {
        last_message_at: timestamp,
        last_message_is_from_me: isFromMe,
      };

      if (!isFromMe) {
        updateData.last_customer_message_at = timestamp;

        // Customer replied - check automation and pause it
        const { data: automation } = await supabase
          .from('whatsapp_automation_control')
          .select('id, status')
          .eq('account_id', account.id)
          .eq('conversation_id', conversation.id)
          .in('status', ['active', 'processing'])
          .maybeSingle();

        if (automation) {
          await supabase
            .from('whatsapp_automation_control')
            .update({
              status: 'responded',
              conversation_state: 'customer_replied',
            })
            .eq('id', automation.id);

          console.log('[whatsapp-webhook] Automation paused - customer replied', {
            automation_id: automation.id,
            conversation_id: conversation.id,
          });
        }
      }

      await supabase
        .from('whatsapp_conversations')
        .update(updateData)
        .eq('id', conversation.id);

      console.log('[whatsapp-webhook] Message processed', {
        message_id: messageId,
        phone: phoneNumber,
        is_from_me: isFromMe,
        type: messageType,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[whatsapp-webhook] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, // Return 200 to prevent Evolution API retries
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
