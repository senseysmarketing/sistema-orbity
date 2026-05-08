import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

export type MarketingIntegrations = Database["public"]["Tables"]["agency_integrations"]["Row"];

export function useMarketingIntegrations() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const agencyId = currentAgency?.id;

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['marketing-integrations', agencyId],
    queryFn: async () => {
      if (!agencyId) return null;
      const { data, error } = await supabase
        .from('agency_integrations')
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!agencyId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<MarketingIntegrations, 'id' | 'agency_id' | 'created_at' | 'updated_at'>>) => {
      if (!agencyId) throw new Error('No agency');
      const { data, error } = await supabase
        .from('agency_integrations')
        .upsert({ agency_id: agencyId, ...updates }, { onConflict: 'agency_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-integrations', agencyId] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar configurações', description: err.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<MarketingIntegrations, 'id' | 'agency_id' | 'created_at' | 'updated_at'>>) => {
      if (!agencyId) throw new Error('No agency');
      const { data, error } = await supabase
        .from('agency_integrations')
        .update(updates)
        .eq('agency_id', agencyId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-integrations', agencyId] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar configurações', description: err.message, variant: 'destructive' });
    },
  });

  return {
    integrations,
    isLoading,
    updateIntegrations: upsertMutation.mutateAsync,
    isSaving: upsertMutation.isPending || updateMutation.isPending,
  };
}
