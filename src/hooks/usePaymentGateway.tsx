import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";

export interface PaymentSettings {
  id: string;
  agency_id: string;
  active_gateway: 'manual' | 'asaas';
  asaas_api_key: string | null;
  asaas_sandbox: boolean;
  reminder_before_enabled: boolean;
  reminder_before_days: number;
  reminder_due_date_enabled: boolean;
  reminder_overdue_enabled: boolean;
  reminder_overdue_days: number;
  block_access_enabled: boolean;
  block_access_days: number;
  whatsapp_template_reminder: string | null;
  whatsapp_template_overdue: string | null;
}

const defaultSettings: Omit<PaymentSettings, 'id' | 'agency_id'> = {
  active_gateway: 'manual',
  asaas_api_key: null,
  asaas_sandbox: true,
  reminder_before_enabled: false,
  reminder_before_days: 3,
  reminder_due_date_enabled: false,
  reminder_overdue_enabled: false,
  reminder_overdue_days: 1,
  block_access_enabled: false,
  block_access_days: 5,
  whatsapp_template_reminder: null,
  whatsapp_template_overdue: null,
};

export function usePaymentGateway() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const agencyId = currentAgency?.id;

  const { data: settings, isLoading } = useQuery({
    queryKey: ['payment-gateway', agencyId],
    queryFn: async () => {
      if (!agencyId) return null;
      const { data, error } = await supabase
        .from('agency_payment_settings')
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle();
      if (error) throw error;
      return data as PaymentSettings | null;
    },
    enabled: !!agencyId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (updates: Partial<Omit<PaymentSettings, 'id' | 'agency_id'>>) => {
      if (!agencyId) throw new Error('No agency');
      const { data, error } = await supabase
        .from('agency_payment_settings')
        .upsert({ agency_id: agencyId, ...updates }, { onConflict: 'agency_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-gateway', agencyId] });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar configurações', description: err.message, variant: 'destructive' });
    },
  });

  const gateway = settings?.active_gateway ?? 'manual';
  const isAsaasActive = gateway === 'asaas';

  return {
    settings: settings ? settings : { ...defaultSettings, id: '', agency_id: agencyId || '' } as PaymentSettings,
    gateway,
    isAsaasActive,
    isLoading,
    updateSettings: upsertMutation.mutateAsync,
    isSaving: upsertMutation.isPending,
  };
}
