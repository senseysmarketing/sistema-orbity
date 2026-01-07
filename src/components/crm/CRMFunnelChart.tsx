import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelChart, Funnel, LabelList, ResponsiveContainer, Tooltip } from "recharts";

interface Lead {
  id: string;
  status: string;
  value: number;
  created_at: string;
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

    // Count leads by stage
    const totalLeads = filteredLeads.length;
    const qualified = filteredLeads.filter(l => 
      ['qualified', 'contacted', 'meeting_scheduled', 'proposal', 'negotiation', 'won'].includes(l.status)
    ).length;
    const meetings = filteredLeads.filter(l => 
      ['meeting_scheduled', 'proposal', 'negotiation', 'won'].includes(l.status)
    ).length;
    const proposals = filteredLeads.filter(l => 
      ['proposal', 'negotiation', 'won'].includes(l.status)
    ).length;
    const won = filteredLeads.filter(l => l.status === 'won').length;

    // Calculate conversion rates
    const qualifiedRate = totalLeads > 0 ? ((qualified / totalLeads) * 100).toFixed(1) : "0";
    const meetingsRate = qualified > 0 ? ((meetings / qualified) * 100).toFixed(1) : "0";
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
        name: "Qualificados", 
        value: qualified, 
        fill: FUNNEL_COLORS[1],
        conversionRate: `${qualifiedRate}%`
      },
      { 
        name: "Reuniões", 
        value: meetings, 
        fill: FUNNEL_COLORS[2],
        conversionRate: `${meetingsRate}%`
      },
      { 
        name: "Propostas", 
        value: proposals, 
        fill: FUNNEL_COLORS[3],
        conversionRate: `${proposalsRate}%`
      },
      { 
        name: "Vendas", 
        value: won, 
        fill: FUNNEL_COLORS[4],
        conversionRate: `${wonRate}%`
      },
    ];
  }, [leads, dateRange]);

  const generalConversionRate = useMemo(() => {
    const total = funnelData[0]?.value || 0;
    const won = funnelData[4]?.value || 0;
    return total > 0 ? ((won / total) * 100).toFixed(1) : "0";
  }, [funnelData]);

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Funil de Vendas</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                  formatter={(value: string, entry: any) => {
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

        {/* Conversion rates between stages */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t">
          {funnelData.slice(1).map((stage, index) => {
            const previousStage = funnelData[index];
            const rate = previousStage.value > 0 
              ? ((stage.value / previousStage.value) * 100).toFixed(1) 
              : "0";
            return (
              <div key={stage.name} className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  {previousStage.name} → {stage.name}
                </div>
                <div className="text-lg font-bold" style={{ color: stage.fill }}>
                  {rate}%
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
