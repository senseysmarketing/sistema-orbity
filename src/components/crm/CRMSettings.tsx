import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GitMerge, Target, MessageCircle, Link2, DollarSign, ArrowLeft } from "lucide-react";
import { CustomStatusManager } from "./CustomStatusManager";
import { LeadScoringConfig } from "./LeadScoringConfig";
import { WhatsAppTemplateManager } from "./WhatsAppTemplateManager";
import { MetaIntegrationConfig } from "./MetaIntegrationConfig";
import { WebhooksManager } from "./WebhooksManager";
import { ManualInvestmentManager } from "./ManualInvestmentManager";

export type CRMSettingsView = "hub" | "status" | "scoring" | "whatsapp" | "sources" | "investments";
type View = CRMSettingsView;

interface CRMSettingsProps {
  onViewChange?: (view: CRMSettingsView) => void;
}

interface HubCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  onClick: () => void;
}

function HubCard({ icon: Icon, title, description, onClick }: HubCardProps) {
  return (
    <Card
      onClick={onClick}
      className="group h-full hover:border-primary/50 transition-colors cursor-pointer"
    >
      <CardHeader>
        <Icon className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary mb-2" />
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function CRMSettings({ onViewChange }: CRMSettingsProps = {}) {
  const [view, setView] = useState<View>("hub");
  const containerRef = useRef<HTMLDivElement>(null);

  // Guardrail #2: reset scroll on view change + notify parent
  useEffect(() => {
    onViewChange?.(view);
    containerRef.current?.scrollTo({ top: 0 });
    const dialog = containerRef.current?.closest('[role="dialog"]') as HTMLElement | null;
    dialog?.scrollTo({ top: 0 });
  }, [view, onViewChange]);

  if (view === "hub") {
    return (
      <div ref={containerRef} className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Personalize seu pipeline de vendas e integrações
        </p>

        <div className="grid grid-cols-1 gap-4 items-stretch">
          <HubCard
            icon={GitMerge}
            title="Status do Funil"
            description="Personalize as etapas do seu pipeline de vendas"
            onClick={() => setView("status")}
          />
          <HubCard
            icon={Target}
            title="Qualificação de Leads"
            description="Configure o sistema de pontuação para priorizar oportunidades"
            onClick={() => setView("scoring")}
          />
          <HubCard
            icon={MessageCircle}
            title="Cadência de WhatsApp"
            description="Modelos de mensagem e sequências automáticas de follow-up"
            onClick={() => setView("whatsapp")}
          />
          <HubCard
            icon={Link2}
            title="Fontes & Integrações"
            description="Conecte Meta Ads e webhooks para captura automática de leads"
            onClick={() => setView("sources")}
          />
          <HubCard
            icon={DollarSign}
            title="Investimentos Manuais"
            description="Registre investimentos em mídia fora das integrações automáticas"
            onClick={() => setView("investments")}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <Button
        variant="ghost"
        onClick={() => setView("hub")}
        className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      {view === "status" && <CustomStatusManager />}
      {view === "scoring" && <LeadScoringConfig />}
      {view === "whatsapp" && <WhatsAppTemplateManager />}
      {view === "sources" && (
        <>
          <MetaIntegrationConfig />
          <Separator className="my-6" />
          <WebhooksManager />
        </>
      )}
      {view === "investments" && <ManualInvestmentManager />}
    </div>
  );
}
