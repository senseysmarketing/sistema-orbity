import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { GitMerge, Target, MessageCircle, Link2, DollarSign } from "lucide-react";
import { CustomStatusManager } from "./CustomStatusManager";
import { LeadScoringConfig } from "./LeadScoringConfig";
import { WhatsAppTemplateManager } from "./WhatsAppTemplateManager";
import { MetaIntegrationConfig } from "./MetaIntegrationConfig";
import { WebhooksManager } from "./WebhooksManager";
import { ManualInvestmentManager } from "./ManualInvestmentManager";

interface SettingCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  sheetTitle: string;
  sheetDescription: string;
  sheetWidth: string;
  children: React.ReactNode;
}

function SettingCard({
  icon: Icon,
  title,
  description,
  sheetTitle,
  sheetDescription,
  sheetWidth,
  children,
}: SettingCardProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Card className="group h-full hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <Icon className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary mb-2" />
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
        </Card>
      </SheetTrigger>
      <SheetContent side="right" className={`${sheetWidth} overflow-y-auto`}>
        <SheetHeader className="mb-6">
          <SheetTitle>{sheetTitle}</SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

export function CRMSettings() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Personalize seu pipeline de vendas e integrações
      </p>

      <div className="grid grid-cols-1 gap-4 items-stretch">
        <SettingCard
          icon={GitMerge}
          title="Status do Funil"
          description="Personalize as etapas do seu pipeline de vendas"
          sheetTitle="Status do Funil"
          sheetDescription="Defina as colunas que compõem o seu pipeline de vendas e a ordem em que aparecem no Kanban."
          sheetWidth="sm:max-w-[600px]"
        >
          <CustomStatusManager />
        </SettingCard>

        <SettingCard
          icon={Target}
          title="Qualificação de Leads"
          description="Configure o sistema de pontuação para priorizar oportunidades"
          sheetTitle="Qualificação de Leads"
          sheetDescription="Defina critérios e pesos para qualificar automaticamente os leads recebidos."
          sheetWidth="sm:max-w-[700px]"
        >
          <LeadScoringConfig />
        </SettingCard>

        <SettingCard
          icon={MessageCircle}
          title="Cadência de WhatsApp"
          description="Modelos de mensagem e sequências automáticas de follow-up"
          sheetTitle="Cadência de WhatsApp"
          sheetDescription="Configure os templates e intervalos das mensagens automáticas enviadas aos leads."
          sheetWidth="sm:max-w-[800px]"
        >
          <WhatsAppTemplateManager />
        </SettingCard>

        <SettingCard
          icon={Link2}
          title="Fontes & Integrações"
          description="Conecte Meta Ads e webhooks para captura automática de leads"
          sheetTitle="Fontes & Integrações"
          sheetDescription="Gerencie a integração com o Meta e os webhooks personalizados que alimentam o seu pipeline."
          sheetWidth="sm:max-w-[800px]"
        >
          <MetaIntegrationConfig />
          <Separator className="my-6" />
          <WebhooksManager />
        </SettingCard>

        <SettingCard
          icon={DollarSign}
          title="Investimentos Manuais"
          description="Registre investimentos em mídia fora das integrações automáticas"
          sheetTitle="Investimentos Manuais"
          sheetDescription="Adicione gastos com tráfego de fontes externas para ter o CAC e ROI completos."
          sheetWidth="sm:max-w-[600px]"
        >
          <ManualInvestmentManager />
        </SettingCard>
      </div>
    </div>
  );
}
