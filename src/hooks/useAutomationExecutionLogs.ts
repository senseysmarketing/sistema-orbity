import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";

export interface AutomationLogRow {
  id: string;
  flow_id: string | null;
  lead_id: string | null;
  event_type: string;
  message: string | null;
  metadata: any;
  created_at: string;
  lead: { name: string | null } | null;
  flow: { name: string | null } | null;
}

const db = supabase as any;

export function useAutomationExecutionLogs(opts?: { flowId?: string | null; limit?: number }) {
  const { currentAgency } = useAgency();
  const agencyId = currentAgency?.id;
  const flowId = opts?.flowId ?? null;
  const limit = opts?.limit ?? 20;

  const query = useQuery({
    queryKey: ["automation-execution-logs", agencyId, flowId, limit],
    enabled: !!agencyId,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      let q = db
        .from("automation_execution_logs")
        .select("id, flow_id, lead_id, event_type, message, metadata, created_at, lead:leads(name), flow:automation_flows(name)")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (flowId) q = q.eq("flow_id", flowId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AutomationLogRow[];
    },
  });

  return {
    logs: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
