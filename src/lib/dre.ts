import type { CashFlowItem } from "@/hooks/useFinancialMetrics";

export type DREInput = Pick<CashFlowItem, "type" | "status" | "sourceType" | "amount" | "category"> & {
  /** Valor originalmente faturado, caso o fluxo de caixa tenha usado o valor recebido. */
  billedAmount?: number;
};

export interface DREValues {
  receitaBruta: number;
  impostos: number;
  receitaLiquida: number;
  custosOper: number;
  folhaPag: number;
  ebitda: number;
  margemPct: number;
  effectiveTaxRate: number;
}

const taxCategoryPattern = /(?:^|[^a-zà-ú])(?:impostos?|tributos?|tribut[aá]ri[ao]s?|das|simples(?: nacional)?|iss|irpj|csll|pis|cofins)(?=$|[^a-zà-ú])/i;

export function isTaxCategory(category?: string): boolean {
  return taxCategoryPattern.test((category ?? "").trim());
}

/** DRE gerencial por competência de vencimento; não é relatório de caixa. */
export function calculateDRE(items: DREInput[]): DREValues {
  const valid = items.filter((item) => item.status !== "CANCELLED");
  const sum = (values: number[]): number =>
    values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);

  const receitaBruta = sum(
    valid.filter((item) => item.type === "INCOME").map((item) => item.billedAmount ?? item.amount),
  );
  const despesas = valid.filter((item) => item.type === "EXPENSE" && item.sourceType === "expense");
  const impostos = sum(despesas.filter((item) => isTaxCategory(item.category)).map((item) => item.amount));
  const custosOper = sum(despesas.filter((item) => !isTaxCategory(item.category)).map((item) => item.amount));
  const folhaPag = sum(
    valid.filter((item) => item.type === "EXPENSE" && item.sourceType === "salary").map((item) => item.amount),
  );
  const receitaLiquida = receitaBruta - impostos;
  const ebitda = receitaLiquida - custosOper - folhaPag;

  return {
    receitaBruta,
    impostos,
    receitaLiquida,
    custosOper,
    folhaPag,
    ebitda,
    margemPct: receitaBruta !== 0 ? (ebitda / receitaBruta) * 100 : 0,
    effectiveTaxRate: receitaBruta !== 0 ? impostos / receitaBruta : 0,
  };
}

export function listDREMonths(start: string, end: string): string[] {
  const [firstYear, firstMonth] = start.split("-").map(Number);
  const [lastYear, lastMonth] = end.split("-").map(Number);
  if (![firstYear, firstMonth, lastYear, lastMonth].every(Number.isInteger)) return [];
  const months: string[] = [];
  for (let year = firstYear, month = firstMonth; year < lastYear || (year === lastYear && month <= lastMonth); ) {
    months.push(String(year) + "-" + String(month).padStart(2, "0"));
    if (months.length > 12) break;
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  return months;
}

export function validateDREPeriod(start: string, end: string, currentMonth: string): string | null {
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!valid.test(start) || !valid.test(end)) return "Selecione o mês inicial e o final.";
  if (start > end) return "O mês inicial deve ser anterior ou igual ao mês final.";
  if (end > currentMonth) return "O relatório histórico não pode incluir meses futuros.";
  if (listDREMonths(start, end).length > 12) return "Selecione no máximo 12 competências por PDF.";
  return null;
}
