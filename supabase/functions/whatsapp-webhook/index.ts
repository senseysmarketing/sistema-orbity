import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Normalizes a phone number to digits-only format for consistent lookups.
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Returns all common phone format variants to try when matching numbers.
 */
function phoneVariants(phone: string): string[] {
  const digits = normalizePhone(phone);
  const variants = new Set<string>([digits, '+' + digits]);
  if (digits.startsWith('55') && digits.length === 13) {
    const local = digits.slice(2);
    variants.add(local);
    variants.add('+55' + local);
  }
  if (!digits.startsWith('55') && digits.length === 11) {
    variants.add('55' + digits);
    variants.add('+55' + digits);
  }
  return [...variants];
}

/**
 * Optional HMAC signature validation.
 */
async function validateSignature(req: Request, body: string): Promise<boolean> {
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  if (!webhookSecret) return true;

  const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-signature');
  if (!signature) {
    console.warn('[whatsapp-webhook] Missing signature header, rejecting request');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return signature === expectedSignature;
  } catch (e) {
    console.error('[whatsapp-webhook] Signature validation error:', e);
    return false;
  }
}

/**
 * Finds active/processing automations for a conversation, with a lead_id fallback.
 */
async function findActiveAutomations(
  supabase: any, accountId: string, conversationId: string, leadId: string | null
): Promise<{ id: string }[]> {
  const { data: byConv } = await supabase
    .from('whatsapp_automation_control').select('id')
    .eq('account_id', accountId).eq('conversation_id', conversationId)
    .in('status', ['active', 'processing']).limit(10);

  if (byConv && byConv.length > 0) return byConv;
  if (!leadId) return [];

  const { data: byLead } = await supabase
    .from('whatsapp_automation_control').select('id')
    .eq('account_id', accountId).eq('lead_id', leadId)
    .in('status', ['active', 'processing']).limit(10);

  return byLead || [];
}

/**
 * Checks if a remoteJid is a valid WhatsApp individual chat.
 * Filters out group chats, status broadcasts, Meta Messenger IDs (@lid), etc.
 */
function isValidWhatsAppJid(remoteJid: string): boolean {
  if (!remoteJid) return false;
  if (remoteJid.includes('@g.us')) return false;
  if (remoteJid === 'status@broadcast') return false;
  if (remoteJid.includes('@lid')) return false;
  // Must be a standard WhatsApp JID
  if (!remoteJid.includes('@s.whatsapp.net')) return false;
  return true;
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

    if (!bodyText || bodyText.trim() === '') {
      console.log('[whatsapp-webhook] Empty body received');
      return new Response('ok', { status: 200 });
    }

    const isValid = await validateSignature(req, bodyText);
    if (!isValid) {
      console.error('[whatsapp-webhook] Invalid webhook signature');
      return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch {
      console.log('[whatsapp-webhook] Non-JSON payload received:', bodyText.substring(0, 200));
      return new Response(JSON.stringify({ success: true, skipped: 'non-json payload' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { event, instance, data } = body || {};

    if (!event) {
      console.log('[whatsapp-webhook] Ping/empty event received');
      return new Response(JSON.stringify({ success: true, skipped: 'no event' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[whatsapp-webhook] Event:', event, 'Instance:', instance);

    if (!instance) {
      return new Response(JSON.stringify({ success: true, skipped: 'no instance' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find account by instance name
    const { data: account } = await supabase
      .from('whatsapp_accounts').select('id, agency_id')
      .eq('instance_name', instance).maybeSingle();

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

      await supabase.from('whatsapp_accounts').update({
        status: newStatus,
        qr_code: newStatus === 'connected' ? null : undefined,
      }).eq('id', account.id);

      console.log('[whatsapp-webhook] Connection status updated:', newStatus);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================
    // Handle messages.update (STATUS UPDATES)
    // Evolution API v2 sends data as an ARRAY of status updates.
    // These are delivery receipts (READ, DELIVERED, etc.), NOT new messages.
    // ========================================
    if (event === 'messages.update') {
      const updates = Array.isArray(data) ? data : [data];

      for (const update of updates) {
        const key = update?.key || update?.keyId;
        const messageId = key?.id || update?.id;
        const statusCode = update?.status || update?.update?.status;

        if (!messageId) continue;

        // Map Evolution status codes to readable status
        let newStatus = 'delivered';
        if (statusCode === 'READ' || statusCode === 3 || statusCode === 4) {
          newStatus = 'read';
        } else if (statusCode === 'DELIVERY_ACK' || statusCode === 2) {
          newStatus = 'delivered';
        } else if (statusCode === 'SERVER_ACK' || statusCode === 1) {
          newStatus = 'sent';
        } else if (statusCode === 'PLAYED' || statusCode === 5) {
          newStatus = 'read';
        }

        // Only update existing messages, don't create new ones
        await supabase.from('whatsapp_messages')
          .update({ status: newStatus })
          .eq('account_id', account.id)
          .eq('message_id', messageId);
      }

      console.log('[whatsapp-webhook] Status updates processed:', updates.length);
      return new Response(JSON.stringify({ success: true, status_updates: updates.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================
    // Handle messages.upsert (NEW MESSAGES)
    // ========================================
    if (event === 'messages.upsert') {
      if (!data) {
        return new Response(JSON.stringify({ success: true, skipped: 'no message data' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Support both flat format (Evolution v2: data.key + data.message)
      // and wrapped format (Evolution v1: data.message.key + data.message.message)
      const key = data?.key || data?.message?.key;
      const messageId = key?.id || crypto.randomUUID();
      const isFromMe = key?.fromMe || false;
      const remoteJid = key?.remoteJid || '';

      // Filter out invalid JIDs (groups, status, Meta Messenger @lid)
      if (!isValidWhatsAppJid(remoteJid)) {
        console.log('[whatsapp-webhook] Skipping invalid JID:', remoteJid);
        return new Response(JSON.stringify({ success: true, skipped: 'invalid jid' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const phoneNumber = normalizePhone(remoteJid.replace('@s.whatsapp.net', ''));

      // Extra guard: skip empty or very short phone numbers
      if (phoneNumber.length < 8) {
        console.log('[whatsapp-webhook] Skipping short phone number:', phoneNumber);
        return new Response(JSON.stringify({ success: true, skipped: 'short phone' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract message content
      const msgContent = data?.message?.message ? data.message.message : data?.message;
      const content = msgContent?.conversation ||
        msgContent?.extendedTextMessage?.text ||
        msgContent?.imageMessage?.caption ||
        msgContent?.videoMessage?.caption ||
        '';

      const messageType = msgContent?.imageMessage ? 'image' :
        msgContent?.videoMessage ? 'video' :
        msgContent?.audioMessage ? 'audio' :
        msgContent?.documentMessage ? 'document' :
        'text';

      // Find or create conversation using phone variants
      const variants = phoneVariants(phoneNumber);

      const { data: matchingConvs } = await supabase
        .from('whatsapp_conversations').select('id, lead_id')
        .eq('account_id', account.id).in('phone_number', variants);

      let conversation: { id: string; lead_id: string | null } | null =
        matchingConvs?.find((c: any) => c.lead_id) ?? matchingConvs?.[0] ?? null;

      if (!conversation) {
        // Try to find the lead by normalized phone using RPC
        const { data: leadRows } = await supabase.rpc('find_lead_by_normalized_phone', {
          p_agency_id: account.agency_id,
          p_phone_digits: phoneNumber,
        });
        const lead = leadRows?.[0] || null;

        // If we found the lead, check for existing conversation linked to it
        if (lead?.id) {
          const { data: leadConv } = await supabase
            .from('whatsapp_conversations').select('id, lead_id')
            .eq('account_id', account.id).eq('lead_id', lead.id).maybeSingle();

          if (leadConv) {
            await supabase.from('whatsapp_conversations')
              .update({ phone_number: phoneNumber }).eq('id', leadConv.id);
            conversation = leadConv;
          }
        }

        if (!conversation) {
          const { data: newConv, error: convError } = await supabase
            .from('whatsapp_conversations')
            .upsert({
              account_id: account.id,
              phone_number: phoneNumber,
              lead_id: lead?.id || null,
            }, { onConflict: 'account_id,phone_number' })
            .select().single();

          if (convError) {
            const { data: raceConvs } = await supabase
              .from('whatsapp_conversations').select('id, lead_id')
              .eq('account_id', account.id).in('phone_number', variants);
            conversation = raceConvs?.find((c: any) => c.lead_id) ?? raceConvs?.[0] ?? null;
          } else {
            conversation = newConv;
          }
        }
      } else if (!conversation.lead_id) {
        // Conversation exists but has no lead_id — try to link it now
        const { data: leadRows2 } = await supabase.rpc('find_lead_by_normalized_phone', {
          p_agency_id: account.agency_id,
          p_phone_digits: phoneNumber,
        });
        const lead = leadRows2?.[0] || null;

        if (lead?.id) {
          await supabase.from('whatsapp_conversations')
            .update({ lead_id: lead.id }).eq('id', conversation.id);
          conversation = { ...conversation, lead_id: lead.id };
        }
      }

      if (!conversation) {
        throw new Error('Failed to create conversation');
      }

      const timestamp = new Date().toISOString();

      // For outgoing messages: check if already stored by whatsapp-send
      let existingMsg: { id: string } | null = null;
      if (isFromMe) {
        const { data } = await supabase
          .from('whatsapp_messages').select('id')
          .eq('account_id', account.id).eq('message_id', messageId).maybeSingle();
        existingMsg = data;
      }

      await supabase.from('whatsapp_messages')
        .upsert({
          account_id: account.id,
          message_id: messageId,
          conversation_id: conversation.id,
          phone_number: phoneNumber,
          message_type: messageType,
          content,
          is_from_me: isFromMe,
          status: 'received',
        }, { onConflict: 'account_id,message_id' });

      const updateData: Record<string, any> = {
        last_message_at: timestamp,
        last_message_is_from_me: isFromMe,
      };

      if (!isFromMe) {
        updateData.last_customer_message_at = timestamp;

        // Stop active automations when customer replies
        const automations = await findActiveAutomations(
          supabase, account.id, conversation.id, conversation.lead_id
        );

        for (const automation of automations) {
          await supabase.from('whatsapp_automation_control').update({
            status: 'responded',
            conversation_state: 'customer_replied',
            conversation_id: conversation.id,
          }).eq('id', automation.id);

          await supabase.from('whatsapp_automation_logs').insert({
            automation_id: automation.id,
            account_id: account.id,
            event: 'customer_replied_webhook',
            details: { conversation_id: conversation.id, phone_number: phoneNumber },
          });
        }

        if (automations.length > 0) {
          console.log('[whatsapp-webhook] Automation(s) responded - customer replied', {
            count: automations.length, conversation_id: conversation.id,
          });
        }
      } else if (!existingMsg) {
        // Operator sent from phone directly — pause automation
        const automations = await findActiveAutomations(
          supabase, account.id, conversation.id, conversation.lead_id
        );

        for (const automation of automations) {
          await supabase.from('whatsapp_automation_control').update({
            status: 'paused',
            conversation_state: 'operator_takeover',
            conversation_id: conversation.id,
          }).eq('id', automation.id);

          await supabase.from('whatsapp_automation_logs').insert({
            automation_id: automation.id,
            account_id: account.id,
            event: 'operator_takeover',
            details: { conversation_id: conversation.id, phone_number: phoneNumber },
          });
        }

        if (automations.length > 0) {
          console.log('[whatsapp-webhook] Automation(s) paused - operator phone takeover', {
            count: automations.length, conversation_id: conversation.id,
          });
        }
      }

      await supabase.from('whatsapp_conversations').update(updateData).eq('id', conversation.id);

      console.log('[whatsapp-webhook] Message processed', {
        message_id: messageId, phone: phoneNumber,
        is_from_me: isFromMe, type: messageType, lead_id: conversation.lead_id,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[whatsapp-webhook] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
