import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseMessageStatus } from "../_shared/uazapi.ts";
import {
  extractMessageContent,
  normalizePhone,
  previewOf,
  resolveConversation,
} from "../_shared/whatsapp.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─────────────────────────────────────────────────────────────────────────────
// CRM: auto-promote lead from initial column on first reply
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_STATUSES = new Set(['leads', 'new', 'novo']);

function normalizeToCanonical(rawStatus: string | null | undefined): string {
  if (!rawStatus) return 'leads';
  const trimmed = String(rawStatus).trim();
  if (!trimmed) return 'leads';
  const key = trimmed
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_').replace(/-+/g, '_');
  const map: Record<string, string> = {
    leads: 'leads', lead: 'leads', new: 'leads', novo: 'leads',
    em_contato: 'em_contato', emcontato: 'em_contato',
    qualified: 'qualified', qualificados: 'qualified', qualificado: 'qualified',
    scheduled: 'scheduled', agendamentos: 'scheduled', agendamento: 'scheduled',
    meeting: 'meeting', reunioes: 'meeting', reuniao: 'meeting',
    proposal: 'proposal', propostas: 'proposal', proposta: 'proposal',
    won: 'won', vendas: 'won', venda: 'won', ganho: 'won', gained: 'won',
    lost: 'lost', perdido: 'lost', perdida: 'lost', loss: 'lost',
  };
  return map[key] || trimmed;
}

async function promoteLeadOnReply(supabase: any, agencyId: string, leadId: string) {
  try {
    const { data: lead } = await supabase
      .from('leads').select('status').eq('id', leadId).maybeSingle();
    if (!lead) return;

    const currentStatus = (lead.status || '').toString().trim().toLowerCase();
    if (!INITIAL_STATUSES.has(currentStatus)) return;

    const { data: statuses } = await supabase
      .from('lead_statuses')
      .select('name, order_position')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('order_position', { ascending: true });

    let target = 'em_contato';
    if (statuses && statuses.length >= 2) target = normalizeToCanonical(statuses[1].name);

    await Promise.all([
      supabase.from('leads').update({ status: target }).eq('id', leadId),
      supabase.from('lead_history').insert({
        lead_id: leadId,
        agency_id: agencyId,
        action_type: 'whatsapp_interaction',
        description: 'Lead interagiu no WhatsApp. O cartão foi movido automaticamente para a próxima etapa.',
      }),
    ]);
  } catch (e) {
    console.error('[whatsapp-webhook] promoteLeadOnReply error:', e);
  }
}

function isValidWhatsAppJid(remoteJid: string): boolean {
  if (!remoteJid) return false;
  if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast' || remoteJid.includes('@newsletter')) return false;
  return remoteJid.includes('@s.whatsapp.net') || remoteJid.includes('@lid') || remoteJid.includes('@c.us');
}

function extractFromMe(payload: any): boolean {
  return payload?.fromMe === true
    || payload?.key?.fromMe === true
    || payload?.message?.key?.fromMe === true
    || payload?.data?.key?.fromMe === true;
}

function extractRemoteJid(payload: any): string {
  return (
    payload?.key?.remoteJid ||
    payload?.message?.key?.remoteJid ||
    payload?.remoteJid ||
    payload?.chatid ||
    payload?.chatId ||
    payload?.data?.key?.remoteJid ||
    ''
  );
}

function extractMessageId(payload: any): string {
  return (
    payload?.key?.id ||
    payload?.message?.key?.id ||
    payload?.messageid ||
    payload?.messageId ||
    payload?.id ||
    payload?.data?.key?.id ||
    ''
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const bodyText = await req.text();
    if (!bodyText) return new Response('ok');
    let body: any;
    try { body = JSON.parse(bodyText); } catch { return new Response('ok'); }

    // Anti-loop / outbound echo
    if (extractFromMe(body) || extractFromMe(body?.data)) {
      return new Response('ok', { status: 200 });
    }

    const event = body?.event || body?.type || body?.EventType;
    const instance = body?.instanceName || body?.instance || body?.instance_name || body?.token_name;
    const data = body?.data ?? body;

    if (!event || !instance) return new Response('ok');

    // Resolve account by instance_name OR api_key (some webhooks send the instance token instead)
    const { data: account } = await supabase
      .from('whatsapp_accounts')
      .select('id, agency_id, instance_name')
      .or(`instance_name.eq.${instance},api_key.eq.${instance}`)
      .maybeSingle();
    if (!account) return new Response('ok');

    // ─── connection event ─────────────────────────────────────────────────
    if (event === 'connection') {
      const state = data?.status || data?.state || data?.connection;
      const rawPhone = data?.wuid || data?.phone || data?.owner || data?.instance?.wuid;
      const phoneNumber = rawPhone ? normalizePhone(String(rawPhone).split('@')[0]) : null;

      if (state === 'connected' || state === 'open') {
        const update: any = { status: 'connected', qr_code: null, connected_at: new Date().toISOString() };
        if (phoneNumber) update.phone_number = phoneNumber;
        await supabase.from('whatsapp_accounts').update(update).eq('id', account.id);
      } else if (state === 'disconnected' || state === 'close' || state === 'closed') {
        await supabase.from('whatsapp_accounts').update({ status: 'disconnected' }).eq('id', account.id);
      }
      return new Response('ok');
    }

    // ─── messages_update (ack) ────────────────────────────────────────────
    if (event === 'messages_update' || event === 'message_update' || event === 'status') {
      const messageId = extractMessageId(data);
      const status = parseMessageStatus(data) || parseMessageStatus(data?.update);
      if (messageId && status) {
        const patch: Record<string, unknown> = { status };
        const now = new Date().toISOString();
        if (status === 'delivered') patch.delivered_at = now;
        if (status === 'read') patch.read_at = now;
        if (status === 'failed') {
          patch.failed_at = now;
          patch.error_message = data?.error || data?.update?.error || 'provider_failed';
        }
        await supabase
          .from('whatsapp_messages')
          .update(patch)
          .eq('account_id', account.id)
          .eq('message_id', messageId);
      }
      return new Response('ok');
    }

    // ─── inbound message ──────────────────────────────────────────────────
    if (event === 'messages' || event === 'message' || event === 'messages.upsert') {
      const remoteJid = extractRemoteJid(data);
      if (!isValidWhatsAppJid(remoteJid)) return new Response('ok');

      const rawPhone = remoteJid.replace(/@(s\.whatsapp\.net|c\.us|lid)$/i, '');
      const phoneNumber = normalizePhone(rawPhone);
      if (!phoneNumber) return new Response('ok');

      const { content, messageType } = extractMessageContent(data);
      const messageId = extractMessageId(data) || crypto.randomUUID();

      // Find linked lead (best-effort)
      const { data: leadRows } = await supabase.rpc('find_lead_by_normalized_phone', {
        p_agency_id: account.agency_id, p_phone_digits: phoneNumber,
      });
      const lead = leadRows?.[0] || null;

      const conversation = await resolveConversation(supabase, {
        accountId: account.id,
        phone: phoneNumber,
        leadId: lead?.id ?? null,
        context: 'lead',
        remoteJid,
      });

      const now = new Date().toISOString();

      // Idempotent insert
      await supabase
        .from('whatsapp_messages')
        .upsert({
          account_id: account.id,
          conversation_id: conversation.id,
          message_id: messageId,
          phone_number: phoneNumber,
          content,
          message_type: messageType,
          is_from_me: false,
          status: 'received',
          source: 'inbound',
          remote_jid: remoteJid,
          provider_payload: data,
        }, { onConflict: 'account_id,message_id' });

      // Update conversation timeline
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message_at: now,
          last_customer_message_at: now,
          last_message_is_from_me: false,
          last_message_preview: previewOf(content || `[${messageType}]`),
          remote_jid: remoteJid,
        })
        .eq('id', conversation.id);

      // Pause any active automation for this lead/conversation
      if (conversation.lead_id) {
        await supabase
          .from('whatsapp_automation_control')
          .update({ status: 'responded', conversation_state: 'customer_replied' })
          .eq('account_id', account.id)
          .eq('lead_id', conversation.lead_id)
          .in('status', ['active', 'processing']);

        await promoteLeadOnReply(supabase, account.agency_id, conversation.lead_id);
      } else {
        await supabase
          .from('whatsapp_automation_control')
          .update({ status: 'responded', conversation_state: 'customer_replied' })
          .eq('conversation_id', conversation.id)
          .in('status', ['active', 'processing']);
      }

      return new Response('ok');
    }

    return new Response('ok');
  } catch (error) {
    console.error('[whatsapp-webhook] Error:', error);
    return new Response('ok');
  }
});
