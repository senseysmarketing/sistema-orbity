import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Filter, Save, Loader2,
  Hand, Globe, Share2, Mail, Phone, Users,
  Calendar, Megaphone, Facebook, MoreHorizontal, Tag,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const LEAD_SOURCES = [
  { value: "manual", label: "Manual" },
  { value: "website", label: "Website" },
  { value: "social_media", label: "Redes Sociais" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefone" },
  { value: "referral", label: "Indicação" },
  { value: "event", label: "Evento" },
  { value: "advertisement", label: "Anúncio" },
  { value: "facebook_leads", label: "Facebook Leads" },
  { value: "facebook_ads", label: "Facebook Ads" },
  { value: "other", label: "Outro" },
];

const SOURCE_ICONS: Record<string, LucideIcon> = {
  manual: Hand,
  website: Globe,
  social_media: Share2,
  email: Mail,
  phone: Phone,
  referral: Users,
  event: Calendar,
  advertisement: Megaphone,
  facebook_leads: Facebook,
  facebook_ads: Facebook,
  other: MoreHorizontal,
};

export function AllowedSourcesManager() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: account, isLoading } = useQuery({
    queryKey: ['whatsapp-account-sources', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return null;
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('id, allowed_sources')
        .eq('agency_id', currentAgency.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  const savedSources: string[] = (account?.allowed_sources as unknown as string[]) || [];

  const [selectedSources, setSelectedSources] = useState<string[]>(savedSources);

  useEffect(() => {
    if (account?.allowed_sources) {
      setSelectedSources(account.allowed_sources as unknown as string[]);
    }
  }, [account]);

  const allSelected = selectedSources.length === LEAD_SOURCES.length;
  const noneSelected = selectedSources.length === 0;

  const hasChanges =
    JSON.stringify([...selectedSources].sort()) !== JSON.stringify([...savedSources].sort());

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!account?.id) throw new Error("Conta WhatsApp não encontrada");
      const { error } = await supabase
        .from('whatsapp_accounts')
        .update({ allowed_sources: selectedSources as any })
        .eq('id', account.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account-sources'] });
      toast({ title: 'Origens salvas!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  const toggleSource = (source: string) => {
    setSelectedSources(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedSources([]);
    } else {
      setSelectedSources(LEAD_SOURCES.map(s => s.value));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Origens Permitidas
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Clique para ativar/desativar cada origem.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs text-primary hover:underline shrink-0 mt-1"
        >
          {allSelected ? "Desmarcar todas" : "Selecionar todas"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEAD_SOURCES.map(source => {
          const Icon = SOURCE_ICONS[source.value] ?? Tag;
          const isActive = selectedSources.includes(source.value);
          return (
            <button
              key={source.value}
              type="button"
              onClick={() => toggleSource(source.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-input hover:border-primary/40 hover:text-foreground"
              )}
              aria-pressed={isActive}
            >
              <Icon className="h-3.5 w-3.5" />
              {source.label}
            </button>
          );
        })}
      </div>

      {noneSelected && (
        <div className="p-2.5 rounded-md bg-muted/50 border">
          <p className="text-xs text-muted-foreground">
            Nenhuma origem selecionada = todas as origens serão aceitas
          </p>
        </div>
      )}

      {hasChanges && (
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full sm:w-auto"
        >
          {saveMutation.isPending ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Save className="mr-1 h-3 w-3" />
          )}
          Salvar Origens
        </Button>
      )}
    </div>
  );
}
