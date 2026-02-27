import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { normalizeLeadStatusToDb } from "@/lib/crm/leadStatus";
import { Info } from "lucide-react";

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

const FUNNEL_WIDTHS = [100, 85, 72, 59, 46, 33, 25];

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
      { name: "Leads", value: totalLeads, fill: FUNNEL_COLORS[0], conversionRate: "100%" },
      { name: "Em contato", value: contacting, fill: FUNNEL_COLORS[1], conversionRate: `${contactingRate}%` },
      { name: "Qualificados", value: qualified, fill: FUNNEL_COLORS[2], conversionRate: `${qualifiedRate}%` },
      { name: "Agendamentos", value: scheduled, fill: FUNNEL_COLORS[3], conversionRate: `${scheduledRate}%` },
      { name: "Reuniões", value: meetings, fill: FUNNEL_COLORS[4], conversionRate: `${meetingsRate}%` },
      { name: "Propostas", value: proposals, fill: FUNNEL_COLORS[5], conversionRate: `${proposalsRate}%` },
      { name: "Vendas", value: won, fill: FUNNEL_COLORS[6], conversionRate: `${wonRate}%` },
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
        {/* Custom CSS Funnel */}
        <div className="flex flex-col items-center gap-0 py-4">
          {funnelData.map((stage, index) => {
            const width = FUNNEL_WIDTHS[index];
            const nextWidth = FUNNEL_WIDTHS[index + 1] ?? width * 0.7;
            const isHovered = hoveredIndex === index;
            const isLast = index === funnelData.length - 1;

            // Trapezoid clip-path: top-left, top-right, bottom-right, bottom-left
            const inset = ((width - nextWidth) / width) * 50;
            const clipPath = isLast
              ? "polygon(2% 0%, 98% 0%, 98% 100%, 2% 100%)"
              : `polygon(0% 0%, 100% 0%, ${100 - inset}% 100%, ${inset}% 100%)`;

            return (
              <div
                key={stage.name}
                className="relative transition-all duration-300 ease-out cursor-pointer"
                style={{
                  width: `${width}%`,
                  height: isHovered ? "58px" : "52px",
                  clipPath,
                  backgroundColor: stage.fill,
                  marginTop: index === 0 ? 0 : "-1px",
                  transform: isHovered ? "scale(1.03)" : "scale(1)",
                  zIndex: isHovered ? 10 : 1,
                  filter: isHovered ? "brightness(1.12)" : "brightness(1)",
                  animationDelay: `${index * 80}ms`,
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Content overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 sm:gap-3 px-2">
                  <span className="text-white font-semibold text-xs sm:text-sm truncate">
                    {stage.name}
                  </span>
                  <span className="text-white/90 font-bold text-sm sm:text-base">
                    {stage.value}
                  </span>
                  <span className="text-white/70 text-[10px] sm:text-xs font-medium">
                    {stage.conversionRate}
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
            );
          })}
        </div>

        {/* No-Show indicator */}
        {noShowData.noShows > 0 && (
          <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-destructive/10 border border-destructive/20">
            <Badge variant="destructive" className="text-xs">
              {noShowData.noShows} No-Show{noShowData.noShows > 1 ? "s" : ""}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Taxa de comparecimento: <span className="font-semibold text-foreground">{noShowData.attendanceRate}%</span>
            </span>
          </div>
        )}

        {/* Conversion rates between stages */}
        <div className="flex gap-2 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t overflow-x-auto scrollbar-hide pb-1">
          {funnelData.slice(1).map((stage, index) => {
            const previousStage = funnelData[index];
            const rate = previousStage.value > 0 
              ? ((stage.value / previousStage.value) * 100).toFixed(1) 
              : "0";
            const getShortName = (name: string) => {
              const abbr: Record<string, string> = {
                "Em contato": "Cont.",
                "Qualificados": "Qual.",
                "Agendamentos": "Agen.",
                "Reuniões": "Reun.",
                "Propostas": "Prop.",
                "Vendas": "Vend.",
              };
              return abbr[name] || name;
            };
            return (
              <div key={stage.name} className="text-center flex-shrink-0 min-w-[60px] sm:min-w-[80px]">
                <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">
                  <span className="hidden sm:inline">{previousStage.name} → {stage.name}</span>
                  <span className="sm:hidden">{getShortName(previousStage.name)} → {getShortName(stage.name)}</span>
                </div>
                <div className="text-sm sm:text-base font-bold" style={{ color: stage.fill }}>
                  {rate}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Benchmarks */}
        <TooltipProvider>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
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
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
