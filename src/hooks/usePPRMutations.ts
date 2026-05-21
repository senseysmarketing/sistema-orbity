import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";

interface CreatePeriodInput {
  program_id: string;
  label: string;
  start_date: string;
  end_date: string;
  profit_target: number;
  ppr_percent: number;
  bonus_pool_mode: "percent_of_profit" | "manual";
  bonus_pool_manual_amount?: number | null;
}

export function usePPRMutations(programId?: string | null) {
  const { currentAgency } = useAgency();
  const qc = useQueryClient();

  const invalidate = (periodId?: string) => {
    qc.invalidateQueries({ queryKey: ["ppr-bonus-periods", currentAgency?.id] });
    if (periodId) {
      qc.invalidateQueries({ queryKey: ["ppr-period-months", periodId] });
      qc.invalidateQueries({ queryKey: ["ppr-employee-results", periodId] });
      qc.invalidateQueries({ queryKey: ["ppr-scorecards", periodId] });
      qc.invalidateQueries({ queryKey: ["ppr-audit-logs", periodId] });
      qc.invalidateQueries({ queryKey: ["ppr-adjustments", periodId] });
    }
  };

  const create = useMutation({
    mutationFn: async (input: CreatePeriodInput) => {
      const { data, error } = await supabase
        .from("bonus_periods")
        .insert({
          agency_id: currentAgency!.id,
          program_id: input.program_id,
          label: input.label,
          start_date: input.start_date,
          end_date: input.end_date,
          profit_target: input.profit_target,
          ppr_percent: input.ppr_percent,
          bonus_pool_mode: input.bonus_pool_mode,
          bonus_pool_manual_amount: input.bonus_pool_manual_amount ?? null,
          bonus_pool_percent: input.ppr_percent,
          revenue_target: 0,
          status: "open",
          calculation_status: "not_calculated",
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Período criado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreatePeriodInput> & { label?: string } }) => {
      const payload: any = { ...updates };
      if (updates.ppr_percent !== undefined) payload.bonus_pool_percent = updates.ppr_percent;
      const { error } = await supabase.from("bonus_periods").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidate(vars.id);
      toast.success("Período atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bonus_periods").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Período excluído");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const recalculate = useMutation({
    mutationFn: async ({ period_id, action }: { period_id: string; action?: "recalculate" | "close" | "reopen"; reason?: string }) => {
      const body: any = { period_id, action: action ?? "recalculate" };
      const { data, error } = await supabase.functions.invoke("calculate-ppr-period", { body });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Erro no cálculo");
      return data;
    },
    onSuccess: (_d, vars) => {
      invalidate(vars.period_id);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao recalcular"),
  });

  const reopen = useMutation({
    mutationFn: async ({ period_id, reason }: { period_id: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke("calculate-ppr-period", {
        body: { period_id, action: "reopen", reason },
      });
      if (error) throw error;
      if (data && (data as any).ok === false) throw new Error((data as any).error || "Erro ao reabrir");
      return data;
    },
    onSuccess: (_d, vars) => {
      invalidate(vars.period_id);
      toast.success("Período reaberto");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao reabrir"),
  });

  return { create, update, remove, recalculate, reopen };
}
