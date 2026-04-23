import { useMemo } from 'react';
import type { CashFlowItem } from './useFinancialMetrics';

const TAX_KEYWORDS = [
  'imposto', 'tributo', 'taxa', 'das', 'simples',
  'iss', 'irpj', 'csll', 'pis', 'cofins',
];

const FALLBACK_TAX_RATE = 0.06;

const isTaxCategory = (category?: string): boolean => {
  if (!category) return false;
  const c = category.toLowerCase().trim();
  return TAX_KEYWORDS.some(k => c.includes(k));
};

const sum = (arr: CashFlowItem[]): number =>
  arr.reduce((acc, i) => acc + (i.amount || 0), 0);

export interface DREStatement {
  receitaBruta: number;
  impostos: number;
  receitaLiquida: number;
  custosOper: number;
  folhaPag: number;
  ebitda: number;
  margemPct: number;
  effectiveTaxRate: number;
  isProjectedTax: boolean;
}

interface UseDREStatementParams {
  cashFlow: CashFlowItem[];
  isForecastMode: boolean;
  totalForecastMRR: number;
  totalActivePayroll: number;
  totalForecastFixed: number;
  historicalCashFlow?: CashFlowItem[];
}

export function useDREStatement({
  cashFlow,
  isForecastMode,
  totalForecastMRR,
  totalActivePayroll,
  totalForecastFixed,
  historicalCashFlow = [],
}: UseDREStatementParams): DREStatement {
  return useMemo(() => {
    if (isForecastMode) {
      // Effective tax rate from historical (previous real month)
      const histIncomes = historicalCashFlow.filter(
        i => i.type === 'INCOME' && i.status === 'PAID'
      );
      const histTaxes = historicalCashFlow.filter(
        i =>
          i.type === 'EXPENSE' &&
          i.sourceType === 'expense' &&
          i.status !== 'CANCELLED' &&
          isTaxCategory(i.category)
      );
      const histRevenue = sum(histIncomes);
      const effectiveTaxRate =
        histRevenue > 0 ? sum(histTaxes) / histRevenue : FALLBACK_TAX_RATE;

      const receitaBruta = totalForecastMRR;
      const impostos = receitaBruta * effectiveTaxRate;
      const receitaLiquida = receitaBruta - impostos;
      const custosOper = totalForecastFixed;
      const folhaPag = totalActivePayroll;
      const ebitda = receitaLiquida - custosOper - folhaPag;
      const margemPct = receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0;

      return {
        receitaBruta,
        impostos,
        receitaLiquida,
        custosOper,
        folhaPag,
        ebitda,
        margemPct,
        effectiveTaxRate,
        isProjectedTax: true,
      };
    }

    // Real mode
    const incomes = cashFlow.filter(
      i => i.type === 'INCOME' && i.status === 'PAID'
    );
    const expensesItems = cashFlow.filter(
      i =>
        i.type === 'EXPENSE' &&
        i.status !== 'CANCELLED' &&
        i.sourceType === 'expense'
    );
    const salariesItems = cashFlow.filter(
      i =>
        i.type === 'EXPENSE' &&
        i.status !== 'CANCELLED' &&
        i.sourceType === 'salary'
    );

    const receitaBruta = sum(incomes);
    const impostos = sum(expensesItems.filter(e => isTaxCategory(e.category)));
    const custosOper = sum(expensesItems.filter(e => !isTaxCategory(e.category)));
    const folhaPag = sum(salariesItems);
    const receitaLiquida = receitaBruta - impostos;
    const ebitda = receitaLiquida - custosOper - folhaPag;
    const margemPct = receitaBruta > 0 ? (ebitda / receitaBruta) * 100 : 0;
    const effectiveTaxRate = receitaBruta > 0 ? impostos / receitaBruta : 0;

    return {
      receitaBruta,
      impostos,
      receitaLiquida,
      custosOper,
      folhaPag,
      ebitda,
      margemPct,
      effectiveTaxRate,
      isProjectedTax: false,
    };
  }, [
    cashFlow,
    isForecastMode,
    totalForecastMRR,
    totalActivePayroll,
    totalForecastFixed,
    historicalCashFlow,
  ]);
}
