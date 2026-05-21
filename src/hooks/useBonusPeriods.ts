import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";

export interface BonusPeriod {
  id: string;
  agency_id: string;
  program_id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: string;
  calculation_status: string;
  calculation_error: string | null;
  calculated_at: string | null;
  closed_at: string | null;
  closed_by: string | null;
  profit_target: number;
  profit_actual: number;
  ppr_percent: number;
  bonus_pool_mode: string;
  bonus_pool_manual_amount: number | null;
  bonus_pool_amount: number;
  target_is_blocking: boolean;
  min_nps_target: number;
  nps_actual: number;
  calculation_snapshot: Record<string, unknown> | null;
}

export function useBonusPeriods(programId?: string | null) {
  const { currentAgency } = useAgency();
  return useQuery({
    queryKey: ["ppr-bonus-periods", currentAgency?.id, programId],
    queryFn: async (): Promise<BonusPeriod[]> => {
      let q = supabase
        .from("bonus_periods")
        .select("*")
        .eq("agency_id", currentAgency!.id)
        .order("start_date", { ascending: false });
      if (programId) q = q.eq("program_id", programId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as BonusPeriod[];
    },
    enabled: !!currentAgency?.id,
  });
}
