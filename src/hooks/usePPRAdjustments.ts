import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";

export interface PPRAdjustment {
  id: string;
  agency_id: string;
  period_id: string | null;
  adjustment_type: string;
  amount: number;
  effective_date: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export function usePPRAdjustments(periodId?: string | null) {
  const { currentAgency } = useAgency();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["ppr-adjustments", periodId ?? "all", currentAgency?.id],
    queryFn: async (): Promise<PPRAdjustment[]> => {
      let q = supabase
        .from("ppr_financial_adjustments")
        .select("*")
        .eq("agency_id", currentAgency!.id)
        .order("effective_date", { ascending: false });
      if (periodId) q = q.eq("period_id", periodId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as PPRAdjustment[];
    },
    enabled: !!currentAgency?.id,
  });

  const create = useMutation({
    mutationFn: async (input: {
      period_id: string | null;
      adjustment_type: string;
      amount: number;
      effective_date: string;
      description?: string | null;
    }) => {
      const { error } = await supabase.from("ppr_financial_adjustments").insert({
        agency_id: currentAgency!.id,
        ...input,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ppr-adjustments"] });
      qc.invalidateQueries({ queryKey: ["ppr-bonus-periods"] });
      toast.success("Ajuste salvo");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PPRAdjustment> }) => {
      const { error } = await supabase.from("ppr_financial_adjustments").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ppr-adjustments"] });
      qc.invalidateQueries({ queryKey: ["ppr-bonus-periods"] });
      toast.success("Ajuste atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ppr_financial_adjustments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ppr-adjustments"] });
      qc.invalidateQueries({ queryKey: ["ppr-bonus-periods"] });
      toast.success("Ajuste excluído");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { list, create, update, remove };
}
