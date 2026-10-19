import { useMemo } from 'react';
import type { CashFlowItem } from './useFinancialMetrics';
import { calculateDRE, isTaxCategory } from '@/lib/dre';

const FALLBACK_TAX_RATE = 0.06;

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

    // Real mode: mesmos critérios de competência usados pela exportação.
    return { ...calculateDRE(cashFlow), isProjectedTax: false };
  }, [
    cashFlow,
    isForecastMode,
    totalForecastMRR,
    totalActivePayroll,
    totalForecastFixed,
    historicalCashFlow,
  ]);
}
