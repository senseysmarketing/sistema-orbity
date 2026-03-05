import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Optional HMAC signature validation.
 * If WEBHOOK_SECRET is set in Supabase secrets, validates the x-webhook-signature header.
 */
async function validateSignature(req: Request, body: string): Promise<boolean> {
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  if (!webhookSecret) return true; // No secret configured, skip validation

  const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-signature');
  if (!signature) {
    console.warn('[whatsapp-webhook] Missing signature header, rejecting request');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return signature === expectedSignature;
  } catch (e) {
    console.error('[whatsapp-webhook] Signature validation error:', e);
    return false;
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

    const bodyText = await req.text();

    // --- SIGNATURE VALIDATION ---
    const isValid = await validateSignature(req, bodyText);
    if (!isValid) {
      console.error('[whatsapp-webhook] Invalid webhook signature');
      return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = JSON.parse(bodyText);
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

      // Find or create conversation (upsert to handle unique constraint)
      let { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('id, lead_id')
        .eq('account_id', account.id)
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (!conversation) {
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('agency_id', account.agency_id)
          .eq('phone', phoneNumber)
          .maybeSingle();

        const { data: newConv, error: convError } = await supabase
          .from('whatsapp_conversations')
          .upsert({
            account_id: account.id,
            phone_number: phoneNumber,
            lead_id: lead?.id || null,
          }, { onConflict: 'account_id,phone_number' })
          .select()
          .single();

        if (convError) {
          // Race condition: another request created it, fetch again
          const { data: existingConv } = await supabase
            .from('whatsapp_conversations')
            .select('id, lead_id')
            .eq('account_id', account.id)
            .eq('phone_number', phoneNumber)
            .maybeSingle();
          conversation = existingConv;
        } else {
          conversation = newConv;
        }
      }

      if (!conversation) {
        throw new Error('Failed to create conversation');
      }

      const timestamp = new Date().toISOString();

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

      const updateData: Record<string, any> = {
        last_message_at: timestamp,
        last_message_is_from_me: isFromMe,
      };

      if (!isFromMe) {
        updateData.last_customer_message_at = timestamp;

        // Cancel active automations when customer replies
        const { data: automations } = await supabase
          .from('whatsapp_automation_control')
          .select('id, status')
          .eq('account_id', account.id)
          .eq('conversation_id', conversation.id)
          .in('status', ['active', 'processing'])
          .limit(10);

        if (automations && automations.length > 0) {
          for (const automation of automations) {
            await supabase
              .from('whatsapp_automation_control')
              .update({
                status: 'responded',
                conversation_state: 'customer_replied',
              })
              .eq('id', automation.id);

            // Log the event
            await supabase.from('whatsapp_automation_logs').insert({
              automation_id: automation.id,
              account_id: account.id,
              event: 'customer_replied_webhook',
              details: { conversation_id: conversation.id, phone_number: phoneNumber },
            });
          }

          console.log('[whatsapp-webhook] Automation(s) paused - customer replied', {
            count: automations.length,
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
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
