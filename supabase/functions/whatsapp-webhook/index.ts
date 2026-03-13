import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Normalizes a phone number to digits-only format for consistent lookups.
 * Handles formats like "+5527992661416", "55 27 99266-1416", "27992661416".
 */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Returns all common phone format variants to try when matching numbers.
 * Evolution API sends digits-only (e.g. "5527992661416"), but leads may be
 * stored with different formatting ("+5527992661416", "27992661416", etc.).
 */
function phoneVariants(phone: string): string[] {
  const digits = normalizePhone(phone);
  const variants = new Set<string>([digits, '+' + digits]);
  // Brazilian number with country code 55: also try without country code
  if (digits.startsWith('55') && digits.length === 13) {
    const local = digits.slice(2); // e.g. "27992661416"
    variants.add(local);
    variants.add('+55' + local);
  }
  // Number without country code: also try with 55 prefix
  if (!digits.startsWith('55') && digits.length === 11) {
    variants.add('55' + digits);
    variants.add('+55' + digits);
  }
  return [...variants];
}

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

    // --- EMPTY BODY GUARD ---
    if (!bodyText || bodyText.trim() === '') {
      console.log('[whatsapp-webhook] Empty body received');
      return new Response('ok', { status: 200 });
    }

    // --- SIGNATURE VALIDATION ---
    const isValid = await validateSignature(req, bodyText);
    if (!isValid) {
      console.error('[whatsapp-webhook] Invalid webhook signature — check that WEBHOOK_SECRET env var matches Evolution API webhook secret configuration, or remove WEBHOOK_SECRET to disable signature validation');
      return new Response(JSON.stringify({ success: false, error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- SAFE JSON PARSING ---
    let body: any;
    try {
      body = JSON.parse(bodyText);
    } catch {
      console.log('[whatsapp-webhook] Non-JSON payload received:', bodyText.substring(0, 200));
      return new Response(JSON.stringify({ success: true, skipped: 'non-json payload' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { event, instance, data } = body || {};

    // --- EARLY RETURN ON MISSING EVENT ---
    if (!event) {
      console.log('[whatsapp-webhook] Ping/empty event received');
      return new Response(JSON.stringify({ success: true, skipped: 'no event' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      // Normalize to digits-only so lookups match regardless of lead phone formatting
      const phoneNumber = normalizePhone(remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', ''));

      // Skip group messages and status updates
      if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') {
        return new Response(JSON.stringify({ success: true, skipped: 'group or status' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract message content: flat format has data.message = { conversation: ... }
      // wrapped format has data.message = { key: ..., message: { conversation: ... } }
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

      // Find or create conversation.
      // Phone numbers may be stored in different formats ("+5527...", "5527...", "27..."),
      // so we try all common variants. We fetch ALL matches (not .maybeSingle()) because
      // duplicate conversations may exist from before this fix was deployed, and we must
      // prefer the one that is already linked to a lead.
      const variants = phoneVariants(phoneNumber);

      const { data: matchingConvs } = await supabase
        .from('whatsapp_conversations')
        .select('id, lead_id')
        .eq('account_id', account.id)
        .in('phone_number', variants);

      // Prefer the conversation with lead_id set (the canonical one)
      let conversation: { id: string; lead_id: string | null } | null =
        matchingConvs?.find(c => c.lead_id) ?? matchingConvs?.[0] ?? null;

      if (!conversation) {
        // Try to find the lead using all phone variants
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('agency_id', account.agency_id)
          .in('phone', variants)
          .maybeSingle();

        // If we found the lead, check if there's already a conversation linked to it
        // (e.g. created by startAutomation with a different phone format)
        if (lead?.id) {
          const { data: leadConv } = await supabase
            .from('whatsapp_conversations')
            .select('id, lead_id')
            .eq('account_id', account.id)
            .eq('lead_id', lead.id)
            .maybeSingle();

          if (leadConv) {
            // Update phone_number to the normalized format so future lookups match
            await supabase
              .from('whatsapp_conversations')
              .update({ phone_number: phoneNumber })
              .eq('id', leadConv.id);
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
            .select()
            .single();

          if (convError) {
            // Race condition: another request created it, fetch again
            const { data: raceConvs } = await supabase
              .from('whatsapp_conversations')
              .select('id, lead_id')
              .eq('account_id', account.id)
              .in('phone_number', variants);
            conversation = raceConvs?.find(c => c.lead_id) ?? raceConvs?.[0] ?? null;
          } else {
            conversation = newConv;
          }
        }
      } else if (!conversation.lead_id) {
        // Conversation exists but has no lead_id — try to link it now
        const { data: lead } = await supabase
          .from('leads')
          .select('id')
          .eq('agency_id', account.agency_id)
          .in('phone', variants)
          .maybeSingle();

        if (lead?.id) {
          await supabase
            .from('whatsapp_conversations')
            .update({ lead_id: lead.id })
            .eq('id', conversation.id);
          conversation = { ...conversation, lead_id: lead.id };
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
