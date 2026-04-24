// Helper compartilhado de inserção/agregação de notificações.
// Janela de agregação: 5 minutos.
// Guardrail: NUNCA atualiza created_at (auditoria imutável).
// Atualiza apenas group_count + last_aggregated_at + message.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface NotificationPayload {
  user_id: string;
  agency_id: string;
  type: string;
  priority?: string;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, unknown>;
  entity_type?: string;
  entity_id?: string;
  action_type?: string;
}

const AGGREGATION_WINDOW_MIN = 5;

/**
 * Insere uma notificação ou agrega num registro recente (mesmo user/type/entity, < 5min, não-lida).
 * Returns { aggregated: boolean, id: string }.
 */
export async function insertOrAggregateNotification(
  supabase: SupabaseClient,
  payload: NotificationPayload,
): Promise<{ aggregated: boolean; id: string | null }> {
  const cutoff = new Date(Date.now() - AGGREGATION_WINDOW_MIN * 60 * 1000).toISOString();

  // Só agrega se temos entity_id (caso contrário não há chave de agrupamento confiável)
  if (payload.entity_id && payload.type) {
    const { data: existing, error: findErr } = await supabase
      .from("notifications")
      .select("id, group_count, title")
      .eq("user_id", payload.user_id)
      .eq("type", payload.type)
      .eq("entity_id", payload.entity_id)
      .eq("is_read", false)
      .eq("is_archived", false)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!findErr && existing) {
      const newCount = (existing.group_count ?? 1) + 1;
      const aggregatedMessage = `${newCount} novas atualizações — ${payload.message}`;

      const { error: updateErr } = await supabase
        .from("notifications")
        .update({
          group_count: newCount,
          last_aggregated_at: new Date().toISOString(),
          message: aggregatedMessage,
        })
        .eq("id", existing.id);

      if (!updateErr) {
        return { aggregated: true, id: existing.id };
      }
      console.error("aggregation update failed, falling back to insert:", updateErr);
    }
  }

  // Insert normal
  const { data: inserted, error: insertErr } = await supabase
    .from("notifications")
    .insert({
      user_id: payload.user_id,
      agency_id: payload.agency_id,
      type: payload.type,
      priority: payload.priority ?? "medium",
      title: payload.title,
      message: payload.message,
      action_url: payload.action_url,
      action_label: payload.action_label,
      metadata: payload.metadata ?? {},
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      action_type: payload.action_type,
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("notification insert failed:", insertErr);
    return { aggregated: false, id: null };
  }

  return { aggregated: false, id: inserted.id };
}
