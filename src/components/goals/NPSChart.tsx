import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NPSChartProps {
  promoters: number;
  neutrals: number;
  detractors: number;
  npsScore: number;
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export function NPSChart({ promoters, neutrals, detractors, npsScore }: NPSChartProps) {
  const data = [
    { name: "Promotores", value: promoters },
    { name: "Neutros", value: neutrals },
    { name: "Detratores", value: detractors },
  ];

  const total = promoters + neutrals + detractors;

  if (total === 0) {
    return (
      <Card className="flex items-center justify-center h-full min-h-[300px]">
        <p className="text-sm text-muted-foreground">Insira respostas NPS para visualizar o gráfico</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">Distribuição NPS</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-2">
          <p className="text-3xl font-bold text-foreground">{npsScore}</p>
          <p className="text-xs text-muted-foreground">NPS Score</p>
        </div>
      </CardContent>
    </Card>
  );
}
