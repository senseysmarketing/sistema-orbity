import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UseAdvancedAnalyticsParams {
  agencyId: string;
  selectedMonth: string;
  isOpen: boolean;
}

export function useAdvancedAnalytics({ agencyId, selectedMonth, isOpen }: UseAdvancedAnalyticsParams) {
  const currentYear = selectedMonth.split('-')[0];
  const currentMonthNum = parseInt(selectedMonth.split('-')[1], 10);

  const { data: yearPayments, isLoading } = useQuery({
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

  return useMemo(() => {
    if (!yearPayments) {
      return { ytdRevenue: 0, monthlyAvg: 0, momGrowth: 0, isLoading };
    }

    const ytdRevenue = yearPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const monthlyAvg = currentMonthNum > 0 ? ytdRevenue / currentMonthNum : 0;

    // MoM: current month paid vs previous month paid
    const currentMonthStr = selectedMonth;
    const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
    const prevYear = currentMonthNum === 1 ? parseInt(currentYear) - 1 : parseInt(currentYear);
    const prevMonthStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;

    const revenueByMonth = (monthStr: string) =>
      yearPayments
        .filter(p => p.due_date?.startsWith(monthStr))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    const currentMRR = revenueByMonth(currentMonthStr);
    const prevMRR = revenueByMonth(prevMonthStr);
    const momGrowth = prevMRR > 0 ? ((currentMRR - prevMRR) / prevMRR) * 100 : 0;

    return { ytdRevenue, monthlyAvg, momGrowth, currentMRR, prevMRR, isLoading };
  }, [yearPayments, isLoading, selectedMonth, currentMonthNum, currentYear]);
}
