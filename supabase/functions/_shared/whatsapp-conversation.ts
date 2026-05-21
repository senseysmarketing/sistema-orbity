// Single source of truth for resolving a WhatsApp conversation by
// (account_id, lead_id, phone, remoteJid). Used by webhook, send,
// queue, sync, ghosting and the resolve-whatsapp-conversation edge.
//
// Guarantees ONE conversation per (account_id, lead_id, context='lead').
// If duplicates exist, elects a primary and merges via merge_whatsapp_conversations RPC.

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
  merged_from: string[];
}

type ConvRow = {
  id: string;
  account_id?: string;
  lead_id: string | null;
  client_id: string | null;
  phone_number: string;
  remote_jid: string | null;
  context: string | null;
  last_message_at?: string | null;
  updated_at?: string | null;
};

async function logResolution(
  supabase: any,
  row: {
    account_id?: string | null;
    agency_id?: string | null;
    lead_id?: string | null;
    old_conversation_id?: string | null;
    new_conversation_id?: string | null;
    action: string;
    phone_number?: string | null;
    remote_jid?: string | null;
    details?: Record<string, unknown>;
  },
) {
  try {
    await supabase.from("whatsapp_conversation_resolution_logs").insert(row);
  } catch (e) {
    console.warn("[resolution-log] insert failed", e);
  }
}

async function electPrimary(supabase: any, convs: ConvRow[]): Promise<ConvRow> {
  if (convs.length === 1) return convs[0];
  // Count messages per conversation; tiebreak by last_message_at, updated_at
  const ids = convs.map((c) => c.id);
  const counts = new Map<string, number>();
  try {
    // Use range-based scan; count manually via select head
    for (const id of ids) {
      const { count } = await supabase
        .from("whatsapp_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", id);
      counts.set(id, count || 0);
    }
  } catch {
    // Fallback: leave counts at 0
  }
  const sorted = [...convs].sort((a, b) => {
    const ca = counts.get(a.id) || 0;
    const cb = counts.get(b.id) || 0;
    if (cb !== ca) return cb - ca;
    const la = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const lb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    if (lb !== la) return lb - la;
    const ua = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const ub = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return ub - ua;
  });
  return sorted[0];
}

/**
 * Resolves (or creates) a unique conversation for the given account+lead+phone.
 */
export async function resolveLeadConversation(
  supabase: any,
  args: ResolveLeadConversationArgs,
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
  const merged_from: string[] = [];
  let conv: ConvRow | null = null;
  let resolutionAction = "";

  // (A) lookup by lead_id + context — fetch ALL, merge duplicates
  if (resolvedLeadId) {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("id, account_id, lead_id, client_id, phone_number, remote_jid, context, last_message_at, updated_at")
      .eq("account_id", accountId)
      .eq("lead_id", resolvedLeadId)
      .eq("context", context);
    const rows: ConvRow[] = data || [];
    if (rows.length > 0) {
      const primary = await electPrimary(supabase, rows);
      const duplicates = rows.filter((r) => r.id !== primary.id).map((r) => r.id);
      if (duplicates.length > 0) {
        try {
          await supabase.rpc("merge_whatsapp_conversations", {
            p_primary: primary.id,
            p_duplicates: duplicates,
          });
          merged_from.push(...duplicates);
          // Re-read primary after merge
          const { data: refreshed } = await supabase
            .from("whatsapp_conversations")
            .select("id, account_id, lead_id, client_id, phone_number, remote_jid, context")
            .eq("id", primary.id)
            .maybeSingle();
          conv = refreshed || primary;
        } catch (e) {
          console.error("[resolveLeadConversation] merge failed", e);
          await logResolution(supabase, {
            account_id: accountId,
            agency_id: agencyId ?? null,
            lead_id: resolvedLeadId,
            new_conversation_id: primary.id,
            action: "resolution_error",
            details: { stage: "merge_duplicates", error: String(e), duplicates },
          });
          conv = primary;
        }
      } else {
        conv = primary;
      }
      resolutionAction = "conversation_resolved_by_lead";
    }
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
    if (conv) resolutionAction = "conversation_resolved_by_remote_jid";
  }

  // (C) lookup by phone variants
  if (!conv && variants.length > 0) {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("id, account_id, lead_id, client_id, phone_number, remote_jid, context, last_message_at, updated_at")
      .eq("account_id", accountId)
      .in("phone_number", variants)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false });
    if (data && data.length > 0) {
      const sameLead = resolvedLeadId ? data.find((c: ConvRow) => c.lead_id === resolvedLeadId) : null;
      conv = sameLead || data[0];
      resolutionAction = "conversation_resolved_by_phone";
    }
  }

  // (D) lookup lead by phone if still missing
  if (!resolvedLeadId && agencyId && normalized) {
    try {
      const { data: leadRows } = await supabase.rpc("find_lead_by_normalized_phone", {
        p_agency_id: agencyId,
        p_phone_digits: normalized,
      });
      if (leadRows?.[0]?.id) resolvedLeadId = leadRows[0].id as string;
    } catch (e) {
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
      // Race or unique-index hit (e.g. concurrent resolve): re-read.
      let again: ConvRow | null = null;
      if (resolvedLeadId) {
        const { data } = await supabase
          .from("whatsapp_conversations")
          .select("id, account_id, lead_id, client_id, phone_number, remote_jid, context")
          .eq("account_id", accountId)
          .eq("lead_id", resolvedLeadId)
          .eq("context", context)
          .maybeSingle();
        again = data ?? null;
      }
      if (!again && variants.length > 0) {
        const { data } = await supabase
          .from("whatsapp_conversations")
          .select("id, account_id, lead_id, client_id, phone_number, remote_jid, context")
          .eq("account_id", accountId)
          .in("phone_number", variants)
          .order("updated_at", { ascending: false })
          .limit(1);
        again = data?.[0] ?? null;
      }
      if (!again) {
        await logResolution(supabase, {
          account_id: accountId,
          agency_id: agencyId ?? null,
          lead_id: resolvedLeadId,
          action: "resolution_error",
          phone_number: normalized || null,
          remote_jid: remoteJid ?? null,
          details: { stage: "insert", error: insErr.message || String(insErr) },
        });
        throw insErr;
      }
      conv = again;
    } else {
      conv = inserted as ConvRow;
      created = true;
      await logResolution(supabase, {
        account_id: accountId,
        agency_id: agencyId ?? null,
        lead_id: resolvedLeadId,
        new_conversation_id: conv.id,
        action: "conversation_created",
        phone_number: normalized || null,
        remote_jid: remoteJid ?? null,
      });
    }
  }

  // (F) back-fill missing fields
  const updates: Record<string, unknown> = {};
  if (resolvedLeadId && !conv!.lead_id) {
    updates.lead_id = resolvedLeadId;
    linked = true;
  }
  if (remoteJid && !conv!.remote_jid) updates.remote_jid = remoteJid;
  if (context && (!conv!.context || conv!.context === "lead") && conv!.context !== context) {
    updates.context = context;
  }
  if (Object.keys(updates).length > 0) {
    await supabase.from("whatsapp_conversations").update(updates).eq("id", conv!.id);
    Object.assign(conv!, updates);
    if (linked) {
      await logResolution(supabase, {
        account_id: accountId,
        agency_id: agencyId ?? null,
        lead_id: resolvedLeadId,
        new_conversation_id: conv!.id,
        action: "conversation_linked_to_lead",
      });
    }
  }

  // After backfill, if we just linked a lead, repoint any other orphan/dup
  // conversation for the same lead context to this one (defense in depth).
  if (linked && resolvedLeadId) {
    const { data: maybeDups } = await supabase
      .from("whatsapp_conversations")
      .select("id, account_id, lead_id, last_message_at, updated_at")
      .eq("account_id", accountId)
      .eq("lead_id", resolvedLeadId)
      .eq("context", context);
    const rows: ConvRow[] = maybeDups || [];
    const others = rows.filter((r) => r.id !== conv!.id).map((r) => r.id);
    if (others.length > 0) {
      try {
        await supabase.rpc("merge_whatsapp_conversations", {
          p_primary: conv!.id,
          p_duplicates: others,
        });
        merged_from.push(...others);
      } catch (e) {
        console.error("[resolveLeadConversation] post-link merge failed", e);
      }
    }
  }

  if (resolutionAction && !created) {
    await logResolution(supabase, {
      account_id: accountId,
      agency_id: agencyId ?? null,
      lead_id: conv!.lead_id,
      new_conversation_id: conv!.id,
      action: resolutionAction,
      phone_number: conv!.phone_number,
      remote_jid: conv!.remote_jid,
      details: merged_from.length ? { merged_from } : undefined,
    });
  }

  return {
    id: conv!.id,
    account_id: conv!.account_id ?? accountId,
    lead_id: conv!.lead_id ?? null,
    client_id: conv!.client_id ?? null,
    phone_number: conv!.phone_number ?? normalized ?? "",
    remote_jid: conv!.remote_jid ?? null,
    context: conv!.context ?? context,
    created,
    linked,
    merged_from,
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
