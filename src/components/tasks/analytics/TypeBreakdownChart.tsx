import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Layers } from "lucide-react";
import { TypeDistribution } from "./types";

const TYPE_COLORS: Record<string, string> = {
  redes_sociais: "#ec4899",
  criativos: "#8b5cf6",
  trafego: "#f97316",
  desenvolvimento: "#22c55e",
  suporte: "#f59e0b",
  administrativo: "#6b7280",
  reuniao: "#06b6d4",
};

const DEFAULT_COLOR = "#94a3b8";

interface TypeBreakdownChartProps {
  distribution: TypeDistribution[];
}

export function TypeBreakdownChart({ distribution }: TypeBreakdownChartProps) {
  if (distribution.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5" />
            Distribuição por Tipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum dado de tipo disponível neste período.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = distribution.map((d) => ({
    name: d.label,
    value: d.count,
    percentage: d.percentage,
    fill: TYPE_COLORS[d.type] || DEFAULT_COLOR,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-5 w-5" />
          Distribuição por Tipo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-1/2 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} tarefas`, name]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 space-y-2">
            {data.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span>{item.name}</span>
                </div>
                <span className="text-muted-foreground font-medium">
                  {item.value} ({item.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
