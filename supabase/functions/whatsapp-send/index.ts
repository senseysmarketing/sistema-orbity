import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendText } from "../_shared/uazapi.ts";
import { normalizePhone, previewOf } from "../_shared/whatsapp.ts";
import { resolveLeadConversation } from "../_shared/whatsapp-conversation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

type Source = 'manual_crm' | 'automation' | 'billing' | 'system';

interface SendPayload {
  account_id?: string;
  agency_id?: string;
  phone_number: string;
  message: string;
  conversation_id?: string | null;
  lead_id?: string | null;
  client_id?: string | null;
  payment_id?: string | null;
  source?: Source;
  metadata?: Record<string, unknown>;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function pickConversationContext(source: Source, hasClient: boolean, hasLead: boolean) {
  if (source === 'billing') return 'billing';
  if (source === 'system') return 'system';
  if (hasClient && !hasLead) return 'client';
  return 'lead';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let payload: SendPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ success: false, code: 'invalid_json', error: 'Invalid JSON body' }, 400);
  }

  const {
    account_id, agency_id, phone_number, message,
    conversation_id, lead_id, client_id, payment_id,
    source = 'manual_crm', metadata = {},
  } = payload || ({} as SendPayload);

  if (!phone_number || !message?.trim()) {
    return json({ success: false, code: 'missing_fields', error: 'phone_number and message are required' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // 1) Load account
    let accountQuery = supabase
      .from('whatsapp_accounts')
      .select('id, agency_id, api_url, api_key, status, instance_name, allowed_sources, purpose')
      .limit(1);

    if (account_id) {
      accountQuery = accountQuery.eq('id', account_id);
    } else if (agency_id) {
      accountQuery = accountQuery.eq('agency_id', agency_id).eq('status', 'connected');
    } else {
      return json({ success: false, code: 'missing_account', error: 'account_id or agency_id required' }, 400);
    }

    const { data: accounts, error: accErr } = await accountQuery;
    if (accErr) throw accErr;
    const account = accounts?.[0];

    if (!account) return json({ success: false, code: 'account_not_found', error: 'WhatsApp account not found' }, 404);
    if (account.status !== 'connected' || !account.api_key) {
      return json({
        success: false, code: 'account_not_connected',
        error: `WhatsApp instance is not connected (status=${account.status})`,
      }, 409);
    }

    // 2) Allowed sources gate (purpose-based routing)
    const allowed = Array.isArray(account.allowed_sources) ? account.allowed_sources as string[] : null;
    if (allowed && allowed.length > 0 && source !== 'manual_crm' && !allowed.includes(source)) {
      return json({
        success: false, code: 'source_not_allowed',
        error: `Source '${source}' is not allowed for this instance`,
      }, 403);
    }

    // 3) Send via provider
    const normalized = normalizePhone(phone_number);
    if (!normalized || normalized.length < 10) {
      return json({ success: false, code: 'invalid_phone', error: 'Invalid phone number' }, 400);
    }

    const sendRes = await sendText(account, { number: normalized, text: message });

    if (!sendRes.ok) {
      console.error('[whatsapp-send] Provider error', {
        account_id: account.id, status: sendRes.status, error: sendRes.error,
      });
      return json({
        success: false, code: 'provider_failed',
        error: sendRes.error || 'Provider send failed',
        provider: { status: sendRes.status },
      }, 502);
    }

    // 4) Resolve / create conversation
    const conv = await resolveLeadConversation(supabase, {
      accountId: account.id,
      agencyId: account.agency_id,
      phone: normalized,
      leadId: lead_id ?? null,
      remoteJid: sendRes.remoteJid,
      context: pickConversationContext(source, !!client_id, !!lead_id),
    });
    if (client_id && !conv.client_id) {
      await supabase.from('whatsapp_conversations').update({ client_id }).eq('id', conv.id);
    }

    // 5) Insert outbound message
    const messageId = sendRes.messageId || crypto.randomUUID();
    const now = new Date().toISOString();

    const msgRow = {
      account_id: account.id,
      conversation_id: conv.id,
      lead_id: lead_id ?? conv.lead_id ?? null,
      message_id: messageId,
      phone_number: normalized,
      content: message,
      message_type: 'text',
      is_from_me: true,
      status: 'sent',
      source,
      metadata: {
        ...metadata,
        was_sent_by_api: true,
        payment_id: payment_id ?? null,
        lead_id: lead_id ?? null,
        client_id: client_id ?? null,
      },
      remote_jid: sendRes.remoteJid,
      provider_payload: sendRes.raw ?? null,
      sent_at: now,
    };

    const { error: insertErr } = await supabase
      .from('whatsapp_messages')
      .upsert(msgRow, { onConflict: 'account_id,message_id' });

    if (insertErr) {
      console.error('[whatsapp-send] Failed to persist message', insertErr);
    }

    // 6) Update conversation timeline
    await supabase
      .from('whatsapp_conversations')
      .update({
        last_message_at: now,
        last_message_is_from_me: true,
        last_message_preview: previewOf(message),
      })
      .eq('id', conv.id);

    return json({
      success: true,
      conversation_id: conv.id,
      message_id: messageId,
      status: 'sent',
      provider: {
        messageId: sendRes.messageId,
        remoteJid: sendRes.remoteJid,
        status: sendRes.providerStatus,
      },
    });
  } catch (err) {
    console.error('[whatsapp-send] Unexpected error', err);
    return json({
      success: false, code: 'unexpected_error',
      error: err instanceof Error ? err.message : String(err),
    }, 500);
  }
});
