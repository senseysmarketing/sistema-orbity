import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";

export interface PaymentSettings {
  id: string;
  agency_id: string;
  active_gateway: 'manual' | 'asaas' | 'conexa';
  asaas_api_key: string | null;
  asaas_sandbox: boolean;
  asaas_enabled: boolean;
  conexa_api_key: string | null;
  conexa_token: string | null;
  conexa_enabled: boolean;
  reminder_before_enabled: boolean;
  reminder_before_days: number;
  reminder_due_date_enabled: boolean;
  reminder_overdue_enabled: boolean;
  reminder_overdue_days: number;
  block_access_enabled: boolean;
  block_access_days: number;
  whatsapp_template_reminder: string | null;
  whatsapp_template_overdue: string | null;
  notify_via_email: boolean;
  notify_via_whatsapp: boolean;
  asaas_webhook_token: string | null;
  conexa_webhook_token: string | null;
  default_fine_percentage: number;
  default_interest_percentage: number;
  discount_percentage: number;
  discount_days_before: number;
}

const defaultSettings: Omit<PaymentSettings, 'id' | 'agency_id'> = {
  active_gateway: 'manual',
  asaas_api_key: null,
  asaas_sandbox: true,
  asaas_enabled: false,
  conexa_api_key: null,
  conexa_token: null,
  conexa_enabled: false,
  reminder_before_enabled: false,
  reminder_before_days: 3,
  reminder_due_date_enabled: false,
  reminder_overdue_enabled: false,
  reminder_overdue_days: 1,
  block_access_enabled: false,
  block_access_days: 5,
  whatsapp_template_reminder: null,
  whatsapp_template_overdue: null,
  notify_via_email: true,
  notify_via_whatsapp: true,
  asaas_webhook_token: null,
  conexa_webhook_token: null,
  default_fine_percentage: 2.00,
  default_interest_percentage: 1.00,
  discount_percentage: 0.00,
  discount_days_before: 0,
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

  const isAsaasActive = !!(settings?.asaas_enabled && settings?.asaas_api_key);
  const isConexaActive = !!(settings?.conexa_enabled && settings?.conexa_api_key);

  const enabledGateways = useMemo(() => {
    const gateways: string[] = ['manual'];
    if (isAsaasActive) gateways.push('asaas');
    if (isConexaActive) gateways.push('conexa');
    return gateways;
  }, [isAsaasActive, isConexaActive]);

  const stableSettings = useMemo(() => {
    return settings ?? { ...defaultSettings, id: '', agency_id: agencyId || '' } as PaymentSettings;
  }, [settings, agencyId]);

  return {
    settings: stableSettings,
    gateway: (settings?.active_gateway ?? 'manual') as 'manual' | 'asaas' | 'conexa',
    isAsaasActive,
    isConexaActive,
    enabledGateways,
    isLoading,
    updateSettings: upsertMutation.mutateAsync,
    isSaving: upsertMutation.isPending,
  };
}
