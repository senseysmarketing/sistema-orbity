// Single source of truth for resolving a WhatsApp conversation by
// (account_id, lead_id, phone, remoteJid). Used by webhook, send,
// queue, sync, ghosting and the resolve-whatsapp-conversation edge.

import { normalizePhone, phoneVariants } from "./whatsapp.ts";

export type ConversationContext = "lead" | "client" | "billing" | "system";

export interface ResolveLeadConversationArgs {
  accountId: string;
  agencyId?: string | null;
  leadId?: string | null;
  phone?: string | null;
  remoteJid?: string | null;
  context?: ConversationContext;
}

export interface ResolvedConversation {
  id: string;
  account_id: string;
  lead_id: string | null;
  client_id: string | null;
  phone_number: string;
  remote_jid: string | null;
  context: string | null;
  created: boolean;
  linked: boolean;
}

interface LogFn {
  (action: string, payload?: Record<string, unknown>): Promise<void>;
}

/**
 * Resolves (or creates) a unique conversation for the given account+lead+phone.
 *
 * Strategy:
 *   1) Normalize phone, build BR variants.
 *   2) Try account_id + lead_id.
 *   3) Try account_id + remote_jid.
 *   4) Try account_id + phone_number IN variants.
 *   5) If we have leadId or find_lead_by_normalized_phone returns a lead and the
 *      conversation is orphan (lead_id IS NULL), back-fill lead_id.
 *   6) If duplicates exist, prefer the one with most recent activity (or with
 *      messages), back-fill orphans with the resolved lead_id.
 *   7) Otherwise insert a new conversation.
 */
export async function resolveLeadConversation(
  supabase: any,
  args: ResolveLeadConversationArgs,
  log?: LogFn,
): Promise<ResolvedConversation> {
  const { accountId, agencyId, leadId, phone, remoteJid, context = "lead" } = args;
  if (!accountId) throw new Error("accountId is required");

  const normalized = phone ? normalizePhone(phone) : "";
  const variants = normalized
    ? Array.from(new Set([normalized, ...phoneVariants(normalized)])).filter(Boolean)
    : [];

  let resolvedLeadId: string | null = leadId ?? null;
  let created = false;
  let linked = false;

  // (A) lookup by lead
  let conv: any = null;
  if (resolvedLeadId) {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("id, account_id, lead_id, client_id, phone_number, remote_jid, context")
      .eq("account_id", accountId)
      .eq("lead_id", resolvedLeadId)
      .order("updated_at", { ascending: false })
      .limit(1);
    conv = data?.[0] ?? null;
  }

  // (B) lookup by remote_jid
  if (!conv && remoteJid) {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("id, account_id, lead_id, client_id, phone_number, remote_jid, context")
      .eq("account_id", accountId)
      .eq("remote_jid", remoteJid)
      .order("updated_at", { ascending: false })
      .limit(1);
    conv = data?.[0] ?? null;
  }

  // (C) lookup by phone variants
  if (!conv && variants.length > 0) {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("id, account_id, lead_id, client_id, phone_number, remote_jid, context, updated_at, last_message_at")
      .eq("account_id", accountId)
      .in("phone_number", variants)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });
    if (data && data.length > 0) {
      // Prefer conv already linked to the same lead, then most recent.
      const sameLead = resolvedLeadId
        ? data.find((c: any) => c.lead_id === resolvedLeadId)
        : null;
      conv = sameLead || data[0];
    }
  }

  // (D) lookup lead by phone if we still don't have one
  if (!resolvedLeadId && agencyId && normalized) {
    try {
      const { data: leadRows } = await supabase.rpc("find_lead_by_normalized_phone", {
        p_agency_id: agencyId,
        p_phone_digits: normalized,
      });
      if (leadRows?.[0]?.id) resolvedLeadId = leadRows[0].id as string;
    } catch (e) {
      // RPC failure shouldn't block resolution.
      console.warn("[resolveLeadConversation] find_lead_by_normalized_phone failed", e);
    }
  }

  // (E) create if still missing
  if (!conv) {
    const insertPayload: Record<string, unknown> = {
      account_id: accountId,
      phone_number: normalized || phone || "",
      lead_id: resolvedLeadId,
      context,
      remote_jid: remoteJid ?? null,
    };
    const { data: inserted, error: insErr } = await supabase
      .from("whatsapp_conversations")
      .insert(insertPayload)
      .select("id, account_id, lead_id, client_id, phone_number, remote_jid, context")
      .single();
    if (insErr) {
      // Race: re-read.
      const { data: again } = await supabase
        .from("whatsapp_conversations")
        .select("id, account_id, lead_id, client_id, phone_number, remote_jid, context")
        .eq("account_id", accountId)
        .in("phone_number", variants.length ? variants : [normalized || phone || ""])
        .order("updated_at", { ascending: false })
        .limit(1);
      conv = again?.[0] ?? null;
      if (!conv) throw insErr;
    } else {
      conv = inserted;
      created = true;
    }
    if (log) await log("conversation_created", { conversation_id: conv.id });
  }

  // (F) back-fill missing fields
  const updates: Record<string, unknown> = {};
  if (resolvedLeadId && !conv.lead_id) {
    updates.lead_id = resolvedLeadId;
    linked = true;
  }
  if (remoteJid && !conv.remote_jid) updates.remote_jid = remoteJid;
  if (context && (!conv.context || conv.context === "lead") && conv.context !== context) {
    updates.context = context;
  }
  if (Object.keys(updates).length > 0) {
    await supabase.from("whatsapp_conversations").update(updates).eq("id", conv.id);
    Object.assign(conv, updates);
    if (linked && log) await log("conversation_linked_to_lead", { conversation_id: conv.id, lead_id: resolvedLeadId });
  }

  return {
    id: conv.id,
    account_id: conv.account_id ?? accountId,
    lead_id: conv.lead_id ?? null,
    client_id: conv.client_id ?? null,
    phone_number: conv.phone_number ?? normalized ?? "",
    remote_jid: conv.remote_jid ?? null,
    context: conv.context ?? context,
    created,
    linked,
  };
}

/**
 * Best-effort insert into whatsapp_webhook_logs. Never throws.
 */
export async function logWebhookEvent(
  supabase: any,
  row: {
    account_id?: string | null;
    agency_id?: string | null;
    lead_id?: string | null;
    conversation_id?: string | null;
    event: string;
    message_id?: string | null;
    remote_jid?: string | null;
    phone_number?: string | null;
    from_me?: boolean | null;
    resolved_lead?: boolean | null;
    resolved_conversation?: boolean | null;
    action_taken?: string | null;
    error_message?: string | null;
    payload_keys?: string[] | null;
  },
) {
  try {
    await supabase.from("whatsapp_webhook_logs").insert(row);
  } catch (e) {
    console.warn("[webhook-logs] insert failed", e);
  }
}
