import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FunnelChart, Funnel, LabelList, ResponsiveContainer, Tooltip } from "recharts";
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
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))", // Em contato (estágio novo)
  "#22c55e", // Verde para Vendas
];

export function CRMFunnelChart({ leads, dateRange }: CRMFunnelChartProps) {
  const funnelData = useMemo(() => {
    // Filter by date range if provided
    let filteredLeads = leads;
    if (dateRange?.from && dateRange?.to) {
      filteredLeads = leads.filter(lead => {
        const createdAt = new Date(lead.created_at);
        return createdAt >= dateRange.from && createdAt <= dateRange.to;
      });
    }

    // Contagem por estágio do funil (acumulativo - considera que passou pelo estágio anterior)
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

    // Calculate conversion rates between stages
    const contactingRate = totalLeads > 0 ? ((contacting / totalLeads) * 100).toFixed(1) : "0";
    const qualifiedRate = contacting > 0 ? ((qualified / contacting) * 100).toFixed(1) : "0";
    const scheduledRate = qualified > 0 ? ((scheduled / qualified) * 100).toFixed(1) : "0";
    const meetingsRate = scheduled > 0 ? ((meetings / scheduled) * 100).toFixed(1) : "0";
    const proposalsRate = meetings > 0 ? ((proposals / meetings) * 100).toFixed(1) : "0";
    const wonRate = proposals > 0 ? ((won / proposals) * 100).toFixed(1) : "0";

    return [
      { 
        name: "Leads", 
        value: totalLeads, 
        fill: FUNNEL_COLORS[0],
        conversionRate: "100%"
      },
      {
        name: "Em contato",
        value: contacting,
        fill: FUNNEL_COLORS[1],
        conversionRate: `${contactingRate}%`
      },
      { 
        name: "Qualificados", 
        value: qualified, 
        fill: FUNNEL_COLORS[2],
        conversionRate: `${qualifiedRate}%`
      },
      { 
        name: "Agendamentos", 
        value: scheduled, 
        fill: FUNNEL_COLORS[3],
        conversionRate: `${scheduledRate}%`
      },
      { 
        name: "Reuniões", 
        value: meetings, 
        fill: FUNNEL_COLORS[4],
        conversionRate: `${meetingsRate}%`
      },
      { 
        name: "Propostas", 
        value: proposals, 
        fill: FUNNEL_COLORS[5],
        conversionRate: `${proposalsRate}%`
      },
      { 
        name: "Vendas", 
        value: won, 
        fill: FUNNEL_COLORS[6],
        conversionRate: `${wonRate}%`
      },
    ];
  }, [leads, dateRange]);

  const generalConversionRate = useMemo(() => {
    const total = funnelData[0]?.value || 0;
    const won = funnelData[6]?.value || 0;
    return total > 0 ? ((won / total) * 100).toFixed(1) : "0";
  }, [funnelData]);

  // No-show calculation
  const noShowData = useMemo(() => {
    let filtered = leads;
    if (dateRange?.from && dateRange?.to) {
      filtered = leads.filter(l => {
        const d = new Date(l.created_at);
        return d >= dateRange.from && d <= dateRange.to;
      });
    }
    const noShows = filtered.filter(l => normalizeLeadStatusToDb(l.status) === 'lost' && l.loss_reason === 'no_show').length;
    const meetings = funnelData[4]?.value || 0; // Reuniões
    const _scheduled = funnelData[3]?.value || 0; // Agendamentos
    const attendanceRate = (meetings + noShows) > 0 ? ((meetings / (meetings + noShows)) * 100).toFixed(1) : "100";
    return { noShows, attendanceRate };
  }, [leads, dateRange, funnelData]);

  // Benchmarks
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
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantidade: <span className="text-foreground font-medium">{data.value}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Conversão: <span className="text-foreground font-medium">{data.conversionRate}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Funnel
                dataKey="value"
                data={funnelData}
                isAnimationActive
              >
                <LabelList
                  position="right"
                  fill="hsl(var(--foreground))"
                  stroke="none"
                  dataKey="name"
                  fontSize={14}
                  formatter={(value: string, _entry: any) => {
                    const item = funnelData.find(d => d.name === value);
                    return `${value} (${item?.value || 0})`;
                  }}
                />
                <LabelList
                  position="center"
                  fill="white"
                  stroke="none"
                  dataKey="conversionRate"
                  fontSize={12}
                  fontWeight={600}
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
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
