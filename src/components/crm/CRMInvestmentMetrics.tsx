import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DollarSign, 
  TrendingUp, 
  Target, 
  Users, 
  Calculator,
  Percent,
  UserCheck,
  Handshake,
  Info
} from "lucide-react";

interface Lead {
  id: string;
  status: string;
  value: number;
  created_at: string;
}

interface CRMInvestmentMetricsProps {
  leads: Lead[];
  investment: number;
  dateRange?: { from: Date; to: Date };
  metaInvestment?: number;
  manualInvestment?: number;
}

export function CRMInvestmentMetrics({ 
  leads, 
  investment, 
  dateRange,
  metaInvestment = 0,
  manualInvestment = 0,
}: CRMInvestmentMetricsProps) {
  const metrics = useMemo(() => {
    // Filter by date range if provided
    let filteredLeads = leads;
    if (dateRange?.from && dateRange?.to) {
      filteredLeads = leads.filter(lead => {
        const createdAt = new Date(lead.created_at);
        return createdAt >= dateRange.from && createdAt <= dateRange.to;
      });
    }

    const totalLeads = filteredLeads.length;
    const qualifiedLeads = filteredLeads.filter(l => 
      ['qualified', 'scheduled', 'meeting', 'proposal', 'won'].includes(l.status)
    ).length;
    const meetings = filteredLeads.filter(l => 
      ['meeting', 'proposal', 'won'].includes(l.status)
    ).length;
    const wonLeads = filteredLeads.filter(l => l.status === 'won');
    const wonCount = wonLeads.length;
    
    const revenue = wonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    const roas = investment > 0 ? revenue / investment : 0;
    const conversionRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;
    const averageTicket = wonCount > 0 ? revenue / wonCount : 0;
    
    const cpl = investment > 0 && totalLeads > 0 ? investment / totalLeads : 0;
    const costPerQualified = investment > 0 && qualifiedLeads > 0 ? investment / qualifiedLeads : 0;
    const costPerMeeting = investment > 0 && meetings > 0 ? investment / meetings : 0;
    const cpa = investment > 0 && wonCount > 0 ? investment / wonCount : 0;

    return {
      investment,
      revenue,
      roas,
      conversionRate,
      averageTicket,
      cpl,
      costPerQualified,
      costPerMeeting,
      cpa,
      totalLeads,
      qualifiedLeads,
      meetings,
      wonCount,
    };
  }, [leads, investment, dateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const hasBreakdown = metaInvestment > 0 || manualInvestment > 0;

  const leftMetrics = [
    {
      label: "Investimento",
      value: formatCurrency(metrics.investment),
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/30",
      hasTooltip: hasBreakdown,
    },
    {
      label: "Faturamento",
      value: formatCurrency(metrics.revenue),
      icon: TrendingUp,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "ROAS",
      value: `${metrics.roas.toFixed(2)}x`,
      icon: Target,
      color: metrics.roas >= 3 ? "text-emerald-600" : metrics.roas >= 1 ? "text-yellow-600" : "text-red-600",
      bgColor: metrics.roas >= 3 ? "bg-emerald-50 dark:bg-emerald-950/30" : metrics.roas >= 1 ? "bg-yellow-50 dark:bg-yellow-950/30" : "bg-red-50 dark:bg-red-950/30",
    },
    {
      label: "Taxa de Conversão",
      value: `${metrics.conversionRate.toFixed(1)}%`,
      icon: Percent,
      color: "text-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(metrics.averageTicket),
      icon: Calculator,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/30",
    },
  ];

  const rightMetrics = [
    {
      label: "CPL",
      value: formatCurrency(metrics.cpl),
      subtitle: "Custo por Lead",
      icon: Users,
      color: "text-orange-600",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      label: "Custo/Qualificado",
      value: formatCurrency(metrics.costPerQualified),
      subtitle: `${metrics.qualifiedLeads} qualificados`,
      icon: UserCheck,
      color: "text-cyan-600",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    },
    {
      label: "Custo/Reunião",
      value: formatCurrency(metrics.costPerMeeting),
      subtitle: `${metrics.meetings} reuniões`,
      icon: Handshake,
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-950/30",
    },
    {
      label: "CPA",
      value: formatCurrency(metrics.cpa),
      subtitle: "Custo por Aquisição",
      icon: Target,
      color: "text-rose-600",
      bgColor: "bg-rose-50 dark:bg-rose-950/30",
    },
    {
      label: "SQLs",
      value: metrics.qualifiedLeads.toString(),
      subtitle: "Leads Qualificados",
      icon: Users,
      color: "text-teal-600",
      bgColor: "bg-teal-50 dark:bg-teal-950/30",
    },
  ];

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Left Column */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Métricas de Resultado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TooltipProvider>
            {leftMetrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                  <span className="text-sm font-medium">{metric.label}</span>
                  {metric.hasTooltip && hasBreakdown && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        <div className="space-y-1">
                          {metaInvestment > 0 && (
                            <div>Meta Ads: {formatCurrency(metaInvestment)}</div>
                          )}
                          {manualInvestment > 0 && (
                            <div>Manual: {formatCurrency(manualInvestment)}</div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <span className="font-bold">{metric.value}</span>
              </div>
            ))}
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Right Column */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Métricas de Custo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rightMetrics.map((metric) => (
            <div key={metric.label} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </div>
                <div>
                  <span className="text-sm font-medium">{metric.label}</span>
                  {metric.subtitle && (
                    <p className="text-xs text-muted-foreground">{metric.subtitle}</p>
                  )}
                </div>
              </div>
              <span className="font-bold">{metric.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
