import { addDays, addWeeks, addMonths, startOfDay, isAfter, isBefore, parseISO } from "date-fns";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number; // every X days/weeks/months (>=1)
  daysOfWeek?: number[]; // 0=Sun..6=Sat (used when weekly)
  endAt?: string | null; // ISO date string, optional cap
};

/**
 * Compute the next due date for a recurring task.
 * - Iterates so the result is always >= today (00:00 local time).
 * - Returns ISO string (preserving original time-of-day) or null if endAt exceeded.
 */
export function computeNextDueDate(
  currentDue: string,
  rule: RecurrenceRule
): string | null {
  if (!currentDue || !rule || !rule.frequency) return null;

  const interval = Math.max(1, Math.floor(rule.interval || 1));
  const today = startOfDay(new Date());

  let next = new Date(currentDue);
  if (isNaN(next.getTime())) return null;

  const endAtDate = rule.endAt ? parseISO(rule.endAt) : null;

  const advance = (d: Date): Date => {
    if (rule.frequency === "daily") return addDays(d, interval);
    if (rule.frequency === "monthly") return addMonths(d, interval);
    // weekly
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
      // Step forward day by day until we land on an allowed weekday,
      // but skip ahead `interval - 1` weeks first (after we cycle through one week).
      let candidate = addDays(d, 1);
      // Limit safety
      for (let i = 0; i < 7 * Math.max(1, interval) + 7; i++) {
        if (rule.daysOfWeek!.includes(candidate.getDay())) return candidate;
        candidate = addDays(candidate, 1);
      }
      return addWeeks(d, interval);
    }
    return addWeeks(d, interval);
  };

  // Iterate until next >= today (anti-overdue trap)
  let safety = 0;
  do {
    next = advance(next);
    safety++;
    if (safety > 5000) break; // hard cap
  } while (isBefore(startOfDay(next), today));

  if (endAtDate && isAfter(startOfDay(next), startOfDay(endAtDate))) {
    return null;
  }

  return next.toISOString();
}

export function describeRecurrence(rule: RecurrenceRule | null | undefined): string {
  if (!rule) return "";
  const i = Math.max(1, rule.interval || 1);
  if (rule.frequency === "daily") {
    return i === 1 ? "Todos os dias" : `A cada ${i} dias`;
  }
  if (rule.frequency === "monthly") {
    return i === 1 ? "Todo mês" : `A cada ${i} meses`;
  }
  // weekly
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const days = (rule.daysOfWeek || []).map((d) => dayNames[d]).join(", ");
  const base = i === 1 ? "Toda semana" : `A cada ${i} semanas`;
  return days ? `${base} (${days})` : base;
}
