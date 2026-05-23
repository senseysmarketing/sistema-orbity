// Shared WhatsApp domain helpers (phone normalization, conversation resolution, content extraction).
// These are pure functions intended to be reused by whatsapp-send, whatsapp-webhook,
// process-whatsapp-queue and process-billing-reminders.

import { phoneVariants as sharedPhoneVariants } from './phone.ts';

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = digits.slice(1);
  // For Brazilian local numbers (10 or 11 digits without DDI), prepend 55.
  if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
  return digits;
}

export function phoneVariants(raw: string | null | undefined): string[] {
  return sharedPhoneVariants(String(raw || ''));
}

export function previewOf(text: string, max = 120): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max) + '…' : t;
}

/** Extracts visible text content from a Uazapi message payload. */
export function extractMessageContent(input: any): { content: string; messageType: string } {
  if (!input) return { content: '', messageType: 'unknown' };
  const m = input?.message?.message ?? input?.message ?? input;
  const candidates: Array<[string, string]> = [
    ['text', m?.conversation],
    ['text', m?.extendedTextMessage?.text],
    ['text', m?.text],
    ['image', m?.imageMessage?.caption],
    ['video', m?.videoMessage?.caption],
    ['document', m?.documentMessage?.fileName],
    ['audio', m?.audioMessage ? '[áudio]' : ''],
    ['sticker', m?.stickerMessage ? '[sticker]' : ''],
    ['location', m?.locationMessage ? '[localização]' : ''],
  ];
  for (const [type, val] of candidates) {
    if (typeof val === 'string' && val.trim()) return { content: val, messageType: type };
  }
  if (typeof m === 'string' && m.trim()) return { content: m, messageType: 'text' };
  return { content: '', messageType: 'unknown' };
}

/** Replaces {{key}} and {key} placeholders. Unknown keys become empty strings. */
export function formatTemplateVariables(
  template: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  if (!template) return '';
  const resolve = (key: string) => {
    const k = key.trim();
    if (vars[k] !== undefined && vars[k] !== null) return String(vars[k]);
    const lc = k.toLowerCase();
    for (const [vk, vv] of Object.entries(vars)) {
      if (vk.toLowerCase() === lc && vv !== undefined && vv !== null) return String(vv);
    }
    return '';
  };
  return template
    .replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key: string) => resolve(key))
    .replace(/(?<!\{)\{\s*([\w.-]+)\s*\}(?!\})/g, (_match, key: string) => resolve(key));
}

export interface ResolveConversationArgs {
  accountId: string;
  phone: string;
  leadId?: string | null;
  clientId?: string | null;
  context?: 'lead' | 'client' | 'billing' | 'system';
  remoteJid?: string | null;
}

/**
 * Finds (or creates) a whatsapp_conversations row for the given account+phone.
 * Also tries phone variants and back-fills lead_id / client_id / remote_jid / context when missing.
 *
 * Requires a Supabase service-role client.
 */
export async function resolveConversation(supabase: any, args: ResolveConversationArgs) {
  const { accountId, phone, leadId, clientId, context = 'lead', remoteJid } = args;
  const normalized = normalizePhone(phone);
  const variants = Array.from(new Set([normalized, ...phoneVariants(normalized)])).filter(Boolean);

  // 1) Direct match by accountId + any variant
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('id, lead_id, client_id, phone_number, remote_jid, context')
    .eq('account_id', accountId)
    .in('phone_number', variants)
    .order('updated_at', { ascending: false })
    .limit(1);

  let conv = existing?.[0] ?? null;

  if (!conv) {
    const { data: inserted, error } = await supabase
      .from('whatsapp_conversations')
      .insert({
        account_id: accountId,
        phone_number: normalized,
        lead_id: leadId ?? null,
        client_id: clientId ?? null,
        context,
        remote_jid: remoteJid ?? null,
      })
      .select('id, lead_id, client_id, phone_number, remote_jid, context')
      .single();
    if (error) {
      // Race: another caller may have just created it — re-read.
      const { data: again } = await supabase
        .from('whatsapp_conversations')
        .select('id, lead_id, client_id, phone_number, remote_jid, context')
        .eq('account_id', accountId)
        .in('phone_number', variants)
        .limit(1);
      conv = again?.[0] ?? null;
      if (!conv) throw error;
    } else {
      conv = inserted;
    }
  }

  // Back-fill missing references
  const updates: Record<string, unknown> = {};
  if (leadId && !conv.lead_id) updates.lead_id = leadId;
  if (clientId && !conv.client_id) updates.client_id = clientId;
  if (remoteJid && !conv.remote_jid) updates.remote_jid = remoteJid;
  if (context && conv.context !== context && (!conv.context || conv.context === 'lead')) {
    updates.context = context;
  }
  if (Object.keys(updates).length > 0) {
    await supabase.from('whatsapp_conversations').update(updates).eq('id', conv.id);
    Object.assign(conv, updates);
  }

  return conv as {
    id: string;
    lead_id: string | null;
    client_id: string | null;
    phone_number: string;
    remote_jid: string | null;
    context: string;
  };
}
