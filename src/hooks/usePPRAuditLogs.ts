import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PPRAuditLog {
  id: string;
  period_id: string | null;
  agency_id: string;
  action: string;
  actor_user_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

export function usePPRAuditLogs(periodId: string | null | undefined) {
  return useQuery({
    queryKey: ["ppr-audit-logs", periodId],
    queryFn: async (): Promise<PPRAuditLog[]> => {
      const { data, error } = await supabase
        .from("ppr_calculation_logs")
        .select("*")
        .eq("period_id", periodId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as PPRAuditLog[];
    },
    enabled: !!periodId,
  });
}
