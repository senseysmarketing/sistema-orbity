import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseAdvancedAnalyticsParams {
  agencyId: string;
  selectedMonth: string;
  isOpen: boolean;
  selectedYear?: string;
}

export function useAdvancedAnalytics({ agencyId, selectedMonth, isOpen, selectedYear }: UseAdvancedAnalyticsParams) {
  const currentYear = selectedYear || selectedMonth.split('-')[0];
  const currentMonthNum = parseInt(selectedMonth.split('-')[1], 10);

  const { data: yearPayments, isLoading: isLoadingYear } = useQuery({
    queryKey: ['advanced-analytics', agencyId, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_payments')
        .select('amount, paid_date, due_date, status')
        .eq('agency_id', agencyId)
        .eq('status', 'paid')
        .gte('due_date', `${currentYear}-01-01`)
        .lte('due_date', `${currentYear}-12-31`);
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!agencyId,
    staleTime: 60_000,
  });

  // When January, prev month is in the previous year — fetch that year too
  const prevYear = currentMonthNum === 1 ? String(parseInt(currentYear) - 1) : null;

  const { data: prevYearPayments, isLoading: isLoadingPrev } = useQuery({
    queryKey: ['advanced-analytics', agencyId, prevYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_payments')
        .select('amount, paid_date, due_date, status')
        .eq('agency_id', agencyId)
        .eq('status', 'paid')
        .gte('due_date', `${prevYear}-01-01`)
        .lte('due_date', `${prevYear}-12-31`);
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!agencyId && !!prevYear,
    staleTime: 60_000,
  });

  const isLoading = isLoadingYear || (!!prevYear && isLoadingPrev);

  return useMemo(() => {
    if (!yearPayments) {
      return { ytdRevenue: 0, monthlyAvg: 0, momGrowth: 0, currentMRR: 0, prevMRR: 0, annualRunRate: 0, isLoading };
    }

    const ytdRevenue = yearPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const monthlyAvg = currentMonthNum > 0 ? ytdRevenue / currentMonthNum : 0;

    const currentMonthStr = selectedMonth;
    const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
    const prevYearStr = currentMonthNum === 1 ? String(parseInt(currentYear) - 1) : currentYear;
    const prevMonthStr = `${prevYearStr}-${String(prevMonthNum).padStart(2, '0')}`;

    const revenueByMonth = (monthStr: string) => {
      const pool = monthStr.startsWith(prevYearStr) && prevYearPayments ? [...yearPayments, ...prevYearPayments] : yearPayments;
      return pool
        .filter(p => p.due_date?.startsWith(monthStr))
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    };

    const currentMRR = revenueByMonth(currentMonthStr);
    const prevMRR = revenueByMonth(prevMonthStr);

    // Fix NaN: safe MoM calculation
    let momGrowth = 0;
    if (prevMRR === 0) {
      momGrowth = currentMRR > 0 ? 100 : 0;
    } else {
      momGrowth = ((currentMRR - prevMRR) / prevMRR) * 100;
    }

    const annualRunRate = currentMRR * 12;

    return { ytdRevenue, monthlyAvg, momGrowth, currentMRR, prevMRR, annualRunRate, isLoading };
  }, [yearPayments, prevYearPayments, isLoading, selectedMonth, currentMonthNum, currentYear]);
}
