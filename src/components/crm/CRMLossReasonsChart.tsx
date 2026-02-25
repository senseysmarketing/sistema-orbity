import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { getLossReasonLabel } from "./LossReasonDialog";
import { normalizeLeadStatusToDb } from "@/lib/crm/leadStatus";

interface Lead {
  id: string;
  status: string;
  loss_reason?: string | null;
  created_at: string;
}

interface CRMLossReasonsChartProps {
  leads: Lead[];
  dateRange?: { from: Date; to: Date };
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "#f59e0b",
  "#8b5cf6",
];

export function CRMLossReasonsChart({ leads, dateRange }: CRMLossReasonsChartProps) {
  const data = useMemo(() => {
    let lostLeads = leads.filter(
      (l) => normalizeLeadStatusToDb(l.status) === "lost"
    );

    if (dateRange?.from && dateRange?.to) {
      lostLeads = lostLeads.filter((l) => {
        const d = new Date(l.created_at);
        return d >= dateRange.from && d <= dateRange.to;
      });
    }

    const counts: Record<string, number> = {};
    lostLeads.forEach((l) => {
      const reason = l.loss_reason || "nao_informado";
      counts[reason] = (counts[reason] || 0) + 1;
    });

    const total = lostLeads.length;

    return Object.entries(counts)
      .map(([key, count]) => ({
        name: key === "nao_informado" ? "Não informado" : getLossReasonLabel(key),
        value: count,
        percent: total > 0 ? ((count / total) * 100).toFixed(1) : "0",
        key,
      }))
      .sort((a, b) => b.value - a.value);
  }, [leads, dateRange]);

  if (data.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg font-semibold">
          Motivos de Perda
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantidade: <span className="text-foreground font-medium">{d.value}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Percentual: <span className="text-foreground font-medium">{d.percent}%</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
