import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { WhatsAppInstanceCard } from "./WhatsAppInstanceCard";
import { useToast } from "@/hooks/use-toast";

export const WhatsAppIntegration = () => {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch billing toggle from agency_payment_settings
  const { data: paymentSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['payment-settings-billing-wa', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return null;
      const { data, error } = await supabase
        .from('agency_payment_settings')
        .select('use_separate_billing_whatsapp')
        .eq('agency_id', currentAgency.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  const useSeparateBilling = paymentSettings?.use_separate_billing_whatsapp ?? false;

  // Toggle mutation
  const toggleBilling = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!currentAgency?.id) throw new Error('No agency');
      const { error } = await supabase
        .from('agency_payment_settings')
        .upsert({
          agency_id: currentAgency.id,
          use_separate_billing_whatsapp: enabled,
        }, { onConflict: 'agency_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings-billing-wa', currentAgency?.id] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar configuração', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle for separate billing number */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
        <div className="space-y-0.5">
          <Label htmlFor="separate-billing" className="text-sm font-medium">
            Usar número exclusivo para cobranças financeiras
          </Label>
          <p className="text-xs text-muted-foreground">
            Isola as mensagens de cobrança em um número separado do atendimento comercial
          </p>
        </div>
        <Switch
          id="separate-billing"
          checked={useSeparateBilling}
          onCheckedChange={(checked) => toggleBilling.mutate(checked)}
          disabled={toggleBilling.isPending}
        />
      </div>

      {/* Instance cards */}
      {useSeparateBilling ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WhatsAppInstanceCard
            purpose="general"
            title="Atendimento & Automações"
            description="CRM, leads e automações de mensagens"
          />
          <WhatsAppInstanceCard
            purpose="billing"
            title="Financeiro & Cobrança"
            description="Régua de cobrança e avisos de vencimento"
          />
        </div>
      ) : (
        <WhatsAppInstanceCard
          purpose="general"
          title="WhatsApp Principal"
          description="Conecte seu WhatsApp para automação de mensagens no CRM"
        />
      )}
    </div>
  );
};
