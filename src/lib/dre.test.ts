import { describe, expect, it } from "vitest";
import { calculateDRE, isTaxCategory, listDREMonths, validateDREPeriod, type DREInput } from "./dre";

const entry = (patch: Partial<DREInput> = {}): DREInput => ({
  type: "INCOME", status: "PENDING", sourceType: "client_payment", amount: 1000, ...patch,
});

describe("DRE gerencial por vencimento", () => {
  it("inclui faturado ainda não pago, exclui cancelados e preserva valor original faturado", () => {
    const result = calculateDRE([
      entry({ status: "PENDING", amount: 1000 }),
      entry({ status: "PAID", amount: 700, billedAmount: 900 }),
      entry({ status: "CANCELLED", amount: 2000 }),
    ]);
    expect(result.receitaBruta).toBe(1900);
  });

  it("separa impostos, custos e folha, mesmo que ainda pendentes", () => {
    const result = calculateDRE([
      entry({ amount: 20000 }),
      entry({ type: "EXPENSE", sourceType: "expense", category: "Impostos", amount: 1000 }),
      entry({ type: "EXPENSE", sourceType: "expense", category: "Taxas Bancárias", amount: 200 }),
      entry({ type: "EXPENSE", sourceType: "salary", status: "PENDING", amount: 12000 }),
      entry({ type: "EXPENSE", sourceType: "salary", status: "CANCELLED", amount: 9999 }),
    ]);
    expect(isTaxCategory("Taxas Bancárias")).toBe(false);
    expect(result.impostos).toBe(1000);
    expect(result.custosOper).toBe(200);
    expect(result.folhaPag).toBe(12000);
    expect(result.receitaLiquida).toBe(19000);
    expect(result.ebitda).toBe(6800);
    expect(result.margemPct).toBe(34);
  });

  it("respeita valores negativos, zeros e competência vazia", () => {
    expect(calculateDRE([]).receitaBruta).toBe(0);
    expect(calculateDRE([]).margemPct).toBe(0);
    const result = calculateDRE([entry({ amount: -100 })]);
    expect(result.receitaBruta).toBe(-100);
  });
});

describe("seleção de competências", () => {
  it("aceita um mês e 12 meses cruzando anos", () => {
    expect(listDREMonths("2026-10", "2026-10")).toEqual(["2026-10"]);
    expect(listDREMonths("2025-10", "2026-09")).toHaveLength(12);
    expect(validateDREPeriod("2025-10", "2026-09", "2026-10")).toBeNull();
  });
  it("bloqueia seleção invertida, futura ou de 13 meses", () => {
    expect(validateDREPeriod("2026-09", "2026-08", "2026-10")).not.toBeNull();
    expect(validateDREPeriod("2025-10", "2026-10", "2026-10")).not.toBeNull();
    expect(validateDREPeriod("2026-10", "2026-11", "2026-10")).not.toBeNull();
  });
});
