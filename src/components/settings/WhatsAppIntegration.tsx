import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Link2 } from "lucide-react";
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

  // Fetch CRM automation toggles from agencies
  const { data: agencyAutomations } = useQuery({
    queryKey: ['agency-crm-automations', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return null;
      const { data, error } = await supabase
        .from('agencies')
        .select('whatsapp_auto_contact, whatsapp_auto_ghosting')
        .eq('id', currentAgency.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  const autoContact = agencyAutomations?.whatsapp_auto_contact ?? true;
  const autoGhosting = agencyAutomations?.whatsapp_auto_ghosting ?? false;

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

  // CRM automations mutation
  const toggleAutomation = useMutation({
    mutationFn: async (payload: { field: 'whatsapp_auto_contact' | 'whatsapp_auto_ghosting'; value: boolean }) => {
      if (!currentAgency?.id) throw new Error('No agency');
      const { error } = await supabase
        .from('agencies')
        .update({ [payload.field]: payload.value })
        .eq('id', currentAgency.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-crm-automations', currentAgency?.id] });
      toast({ title: 'Configuração atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar configuração', description: error.message, variant: 'destructive' });
    },
  });

  // Re-link orphan WhatsApp conversations to leads (manual sync)
  const relinkOrphans = useMutation({
    mutationFn: async () => {
      if (!currentAgency?.id) throw new Error('No agency');
      const { data, error } = await supabase.rpc('relink_orphan_whatsapp_conversations', {
        p_agency_id: currentAgency.id,
      });
      if (error) throw error;
      return (data as any)?.[0] ?? { linked_count: 0, total_orphans: 0 };
    },
    onSuccess: (result: { linked_count: number; total_orphans: number }) => {
      toast({
        title: 'Sincronização concluída',
        description: `${result.linked_count} de ${result.total_orphans} conversas órfãs foram vinculadas a leads.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao sincronizar', description: error.message, variant: 'destructive' });
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

      {/* Manual re-link tool for orphan conversations */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">Sincronizar conversas com leads</Label>
          <p className="text-xs text-muted-foreground">
            Vincula conversas recebidas no WhatsApp aos leads correspondentes pelo número de telefone. Útil quando mensagens chegaram antes do lead ter sido cadastrado.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => relinkOrphans.mutate()}
          disabled={relinkOrphans.isPending}
        >
          {relinkOrphans.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="mr-2 h-4 w-4" />
          )}
          Sincronizar agora
        </Button>
      </div>
    </div>
  );
};
