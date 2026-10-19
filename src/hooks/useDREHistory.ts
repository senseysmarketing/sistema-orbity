import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateDRE, listDREMonths, type DREInput, type DREValues } from "@/lib/dre";

export interface DREMonth {
  month: string;
  values: DREValues;
}

type SourceTable = "client_payments" | "expenses" | "salaries";
const PAGE_SIZE = 1000;

async function fetchAll(
  table: SourceTable, columns: string, agencyId: string, from: string, to: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase.from(table)
      .select(columns)
      .eq("agency_id", agencyId)
      .gte("due_date", from)
      .lte("due_date", to)
      .order("due_date", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error("Falha ao consultar " + table + ": " + error.message);
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function fetchDREHistory(agencyId: string, start: string, end: string): Promise<DREMonth[]> {
  if (!agencyId) throw new Error("Agência não identificada.");
  const months = listDREMonths(start, end);
  if (!months.length || months.length > 12) throw new Error("Período inválido para DRE.");
  const [year, month] = end.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const from = start + "-01";
  const to = end + "-" + String(lastDay).padStart(2, "0");

  const [payments, expenses, salaries] = await Promise.all([
    fetchAll("client_payments", "id, due_date, amount, status", agencyId, from, to),
    fetchAll("expenses", "id, due_date, amount, status, category", agencyId, from, to),
    fetchAll("salaries", "id, due_date, amount, status", agencyId, from, to),
  ]);

  const grouped = new Map<string, DREInput[]>(months.map((m) => [m, []]));
  const include = (rows: Record<string, unknown>[], type: DREInput["type"], sourceType: DREInput["sourceType"]) => {
    for (const row of rows) {
      const monthKey = String(row.due_date ?? "").slice(0, 7);
      const dest = grouped.get(monthKey);
      if (!dest) continue;
      dest.push({
        type,
        sourceType,
        status: String(row.status ?? "pending").toUpperCase() as DREInput["status"],
        amount: Number(row.amount ?? 0),
        category: typeof row.category === "string" ? row.category : undefined,
      });
    }
  };
  include(payments, "INCOME", "client_payment");
  include(expenses, "EXPENSE", "expense");
  include(salaries, "EXPENSE", "salary");

  return months.map((monthKey) => ({ month: monthKey, values: calculateDRE(grouped.get(monthKey) ?? []) }));
}

export function useDREHistory(agencyId: string, start: string, end: string, enabled: boolean) {
  return useQuery({
    queryKey: ["dre-history", agencyId, start, end],
    queryFn: () => fetchDREHistory(agencyId, start, end),
    enabled: enabled && !!agencyId,
    staleTime: 30_000,
    retry: 1,
  });
}
