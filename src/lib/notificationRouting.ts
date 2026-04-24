/**
 * Notification routing matrix helpers.
 *
 * channel_routing JSONB shape:
 *   { [category]: { in_app: boolean, push: boolean, email: boolean } }
 *
 * Categories used in the UI matrix: leads, payments, tasks, meetings, system
 * (system maps to legacy `system_enabled`, used for approvals/system alerts).
 *
 * Fallback policy: if the routing object is empty/missing for a category or
 * channel, default to TRUE so existing users are NOT silenced after deploy.
 */

export type RoutingChannel = "in_app" | "push" | "email";

export type ChannelRouting = Record<
  string,
  Partial<Record<RoutingChannel, boolean>>
>;

export const ROUTING_CATEGORIES = [
  { key: "leads", label: "Novos Leads", icon: "👤" },
  { key: "payments", label: "Pagamentos", icon: "💰" },
  { key: "tasks", label: "Tarefas", icon: "✅" },
  { key: "meetings", label: "Agenda", icon: "📅" },
  { key: "system", label: "Aprovações & Sistema", icon: "🔔" },
] as const;

export const ROUTING_CHANNELS: { key: RoutingChannel; label: string; mobile: string }[] = [
  { key: "in_app", label: "No Sistema", mobile: "Sistema" },
  { key: "push", label: "Push (Telemóvel)", mobile: "Push" },
  { key: "email", label: "E-mail", mobile: "E-mail" },
];

/**
 * Returns whether the given category/channel combo is enabled.
 * Defaults to TRUE when the routing object is empty or the entry is missing.
 */
export function getCellEnabled(
  routing: unknown,
  category: string,
  channel: RoutingChannel,
): boolean {
  if (!routing || typeof routing !== "object") return true;
  const r = routing as ChannelRouting;
  const cat = r[category];
  if (!cat) return true;
  if (cat[channel] === false) return false;
  return true;
}

/**
 * Builds a complete routing object filling missing entries with defaults (true).
 */
export function normalizeRouting(routing: unknown): ChannelRouting {
  const out: ChannelRouting = {};
  for (const cat of ROUTING_CATEGORIES) {
    out[cat.key] = {
      in_app: getCellEnabled(routing, cat.key, "in_app"),
      push: getCellEnabled(routing, cat.key, "push"),
      email: getCellEnabled(routing, cat.key, "email"),
    };
  }
  return out;
}

/**
 * Categories that bypass snooze/routing (critical alerts).
 */
export const BYPASS_CATEGORIES = new Set(["system_alert", "billing"]);

export function isBypassType(type?: string | null): boolean {
  if (!type) return false;
  const t = type.toLowerCase();
  return BYPASS_CATEGORIES.has(t) || t.startsWith("billing") || t === "system_alert";
}
