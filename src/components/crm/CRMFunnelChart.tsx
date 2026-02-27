import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { normalizeLeadStatusToDb } from "@/lib/crm/leadStatus";
import { Info, ArrowRight } from "lucide-react";

interface Lead {
  id: string;
  status: string;
  value: number;
  created_at: string;
  won_at?: string | null;
  loss_reason?: string | null;
}

interface CRMFunnelChartProps {
  leads: Lead[];
  dateRange?: { from: Date; to: Date };
}

const FUNNEL_COLORS = [
  "#6C3FA0",
  "#7E4DB8",
  "#9061C9",
  "#A478D8",
  "#B88FE3",
  "#CBA6ED",
  "#22c55e",
];

const FUNNEL_SHADOW_COLORS = [
  "#4a2870",
  "#5c3590",
  "#6e44a0",
  "#8055b0",
  "#9068c0",
  "#a07ad0",
  "#1a9e4a",
];

const FUNNEL_WIDTHS = [100, 85, 72, 59, 46, 33, 22];

export function CRMFunnelChart({ leads, dateRange }: CRMFunnelChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const funnelData = useMemo(() => {
    let filteredLeads = leads;
    if (dateRange?.from && dateRange?.to) {
      filteredLeads = leads.filter(lead => {
        const createdAt = new Date(lead.created_at);
        return createdAt >= dateRange.from && createdAt <= dateRange.to;
      });
    }

    const totalLeads = filteredLeads.length;

    const contacting = filteredLeads.filter(l =>
      ['em_contato', 'qualified', 'scheduled', 'meeting', 'proposal', 'won'].includes(String(normalizeLeadStatusToDb(l.status)))
    ).length;
    
    const qualified = filteredLeads.filter(l =>
      ['qualified', 'scheduled', 'meeting', 'proposal', 'won'].includes(String(normalizeLeadStatusToDb(l.status)))
    ).length;
    
    const scheduled = filteredLeads.filter(l => 
      ['scheduled', 'meeting', 'proposal', 'won'].includes(String(normalizeLeadStatusToDb(l.status)))
    ).length;
    
    const meetings = filteredLeads.filter(l => 
      ['meeting', 'proposal', 'won'].includes(String(normalizeLeadStatusToDb(l.status)))
    ).length;
    
    const proposals = filteredLeads.filter(l => 
      ['proposal', 'won'].includes(String(normalizeLeadStatusToDb(l.status)))
    ).length;
    
    const won = filteredLeads.filter(l => normalizeLeadStatusToDb(l.status) === 'won').length;

    const contactingRate = totalLeads > 0 ? ((contacting / totalLeads) * 100).toFixed(1) : "0";
    const qualifiedRate = contacting > 0 ? ((qualified / contacting) * 100).toFixed(1) : "0";
    const scheduledRate = qualified > 0 ? ((scheduled / qualified) * 100).toFixed(1) : "0";
    const meetingsRate = scheduled > 0 ? ((meetings / scheduled) * 100).toFixed(1) : "0";
    const proposalsRate = meetings > 0 ? ((proposals / meetings) * 100).toFixed(1) : "0";
    const wonRate = proposals > 0 ? ((won / proposals) * 100).toFixed(1) : "0";

    return [
      { name: "Leads", value: totalLeads, fill: FUNNEL_COLORS[0], shadow: FUNNEL_SHADOW_COLORS[0], conversionRate: "100%" },
      { name: "Em contato", value: contacting, fill: FUNNEL_COLORS[1], shadow: FUNNEL_SHADOW_COLORS[1], conversionRate: `${contactingRate}%` },
      { name: "Qualificados", value: qualified, fill: FUNNEL_COLORS[2], shadow: FUNNEL_SHADOW_COLORS[2], conversionRate: `${qualifiedRate}%` },
      { name: "Agendamentos", value: scheduled, fill: FUNNEL_COLORS[3], shadow: FUNNEL_SHADOW_COLORS[3], conversionRate: `${scheduledRate}%` },
      { name: "Reuniões", value: meetings, fill: FUNNEL_COLORS[4], shadow: FUNNEL_SHADOW_COLORS[4], conversionRate: `${meetingsRate}%` },
      { name: "Propostas", value: proposals, fill: FUNNEL_COLORS[5], shadow: FUNNEL_SHADOW_COLORS[5], conversionRate: `${proposalsRate}%` },
      { name: "Vendas", value: won, fill: FUNNEL_COLORS[6], shadow: FUNNEL_SHADOW_COLORS[6], conversionRate: `${wonRate}%` },
    ];
  }, [leads, dateRange]);

  const generalConversionRate = useMemo(() => {
    const total = funnelData[0]?.value || 0;
    const won = funnelData[6]?.value || 0;
    return total > 0 ? ((won / total) * 100).toFixed(1) : "0";
  }, [funnelData]);

  const noShowData = useMemo(() => {
    let filtered = leads;
    if (dateRange?.from && dateRange?.to) {
      filtered = leads.filter(l => {
        const d = new Date(l.created_at);
        return d >= dateRange.from && d <= dateRange.to;
      });
    }
    const noShows = filtered.filter(l => normalizeLeadStatusToDb(l.status) === 'lost' && l.loss_reason === 'no_show').length;
    const meetings = funnelData[4]?.value || 0;
    const attendanceRate = (meetings + noShows) > 0 ? ((meetings / (meetings + noShows)) * 100).toFixed(1) : "100";
    return { noShows, attendanceRate };
  }, [leads, dateRange, funnelData]);

  const benchmarks = useMemo(() => {
    const convRate = parseFloat(generalConversionRate);
    const connectionRate = funnelData[0]?.value > 0
      ? ((funnelData[1]?.value || 0) / funnelData[0].value) * 100
      : 0;
    const proposals = funnelData[5]?.value || 0;
    const won = funnelData[6]?.value || 0;
    const winRate = proposals > 0 ? (won / proposals) * 100 : 0;

    const getBenchColor = (value: number, good: [number, number], avg: [number, number]) => {
      if (value >= good[0]) return "text-emerald-600";
      if (value >= avg[0]) return "text-yellow-600";
      return "text-destructive";
    };

    return [
      {
        label: "Lead → Venda",
        value: convRate.toFixed(1),
        benchmark: "1-3%",
        color: getBenchColor(convRate, [3, 100], [1, 3]),
        tip: "Benchmark B2B: 1-3%. Acima de 3% é excelente.",
      },
      {
        label: "Lead → Contato",
        value: connectionRate.toFixed(1),
        benchmark: "40-50%",
        color: getBenchColor(connectionRate, [40, 100], [25, 40]),
        tip: "Benchmark Tráfego Pago B2B: 40-50%. Abaixo de 25% indica problema na qualidade dos leads.",
      },
      {
        label: "Proposta → Venda",
        value: winRate.toFixed(1),
        benchmark: "20-30%",
        color: getBenchColor(winRate, [20, 100], [10, 20]),
        tip: "Win Rate saudável: 20-30%. Abaixo de 10% indica problema no discurso de vendas.",
      },
    ];
  }, [generalConversionRate, funnelData]);

  const conversionStages = useMemo(() => {
    return funnelData.slice(1).map((stage, index) => {
      const previousStage = funnelData[index];
      const rate = previousStage.value > 0 
        ? ((stage.value / previousStage.value) * 100).toFixed(1) 
        : "0";
      return {
        from: previousStage.name,
        to: stage.name,
        rate: parseFloat(rate),
        rateStr: `${rate}%`,
        color: stage.fill,
      };
    });
  }, [funnelData]);

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <CardTitle className="text-base sm:text-lg font-semibold">Funil de Vendas</CardTitle>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>Taxa de Conversão Geral:</span>
            <span className="font-semibold text-primary">{generalConversionRate}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - 3D Funnel */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="flex flex-col items-center w-full max-w-[320px]">
              {funnelData.map((stage, index) => {
                const width = FUNNEL_WIDTHS[index];
                const isHovered = hoveredIndex === index;
                const isLast = index === funnelData.length - 1;

                return (
                  <div
                    key={stage.name}
                    className="flex flex-col items-center w-full"
                    style={{ marginTop: index === 0 ? 0 : "6px" }}
                  >
                    {/* Main trapezoid bar */}
                    <div
                      className="relative cursor-pointer transition-all duration-300"
                      style={{
                        width: `${width}%`,
                        height: isHovered ? "50px" : "44px",
                        clipPath: isLast
                          ? "polygon(8% 0%, 92% 0%, 50% 100%)"
                          : "polygon(0% 0%, 100% 0%, 92% 100%, 8% 100%)",
                        backgroundColor: stage.fill,
                        transform: isHovered ? "scale(1.04)" : "scale(1)",
                        zIndex: isHovered ? 10 : 1,
                        boxShadow: isHovered
                          ? `0 4px 20px ${stage.fill}66`
                          : `inset 0 2px 4px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.2)`,
                      }}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      {/* Content */}
                      <div className="absolute inset-0 flex items-center justify-center gap-2 px-2">
                        <span className="text-white font-semibold text-xs sm:text-sm truncate drop-shadow-sm">
                          {stage.name}
                        </span>
                        <span className="text-white/90 font-bold text-sm sm:text-base drop-shadow-sm">
                          {stage.value}
                        </span>
                      </div>

                      {/* Hover tooltip */}
                      {isHovered && (
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full z-20 bg-popover border border-border rounded-lg shadow-lg p-3 whitespace-nowrap pointer-events-none">
                          <p className="font-semibold text-sm text-foreground">{stage.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Quantidade: <span className="text-foreground font-medium">{stage.value}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Conversão: <span className="text-foreground font-medium">{stage.conversionRate}</span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 3D curved bottom edge */}
                    {!isLast && (
                      <div
                        style={{
                          width: `${width * 0.92}%`,
                          height: "8px",
                          backgroundColor: stage.shadow,
                          borderRadius: "0 0 50% 50%",
                          transform: isHovered ? "scale(1.04)" : "scale(1)",
                          transition: "all 0.3s",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Metrics */}
          <div className="flex flex-col gap-4">
            {/* Conversion rates between stages */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Conversões entre Etapas</h4>
              <div className="space-y-2.5">
                {conversionStages.map((stage) => (
                  <div key={`${stage.from}-${stage.to}`} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-[140px] shrink-0">
                      <span className="truncate">{stage.from}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className="truncate">{stage.to}</span>
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(stage.rate, 100)}%`,
                          backgroundColor: stage.color,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold min-w-[48px] text-right" style={{ color: stage.color }}>
                      {stage.rateStr}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benchmarks */}
            <TooltipProvider>
              <div className="pt-3 border-t">
                <h4 className="text-sm font-semibold text-foreground mb-3">Benchmarks</h4>
                <div className="grid grid-cols-3 gap-3">
                  {benchmarks.map((b) => (
                    <div key={b.label} className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{b.label}</span>
                        <UITooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] text-xs">
                            {b.tip}
                          </TooltipContent>
                        </UITooltip>
                      </div>
                      <div className={`text-sm sm:text-base font-bold ${b.color}`}>
                        {b.value}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Benchmark: {b.benchmark}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TooltipProvider>

            {/* No-Show indicator */}
            {noShowData.noShows > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <Badge variant="destructive" className="text-xs">
                  {noShowData.noShows} No-Show{noShowData.noShows > 1 ? "s" : ""}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Taxa de comparecimento: <span className="font-semibold text-foreground">{noShowData.attendanceRate}%</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
