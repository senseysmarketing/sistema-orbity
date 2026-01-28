import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { Activity } from "lucide-react";
import { UserMetrics } from "./types";

interface WorkloadChartProps {
  userMetrics: UserMetrics[];
}

export function WorkloadChart({ userMetrics }: WorkloadChartProps) {
  // Prepare data for stacked bar chart
  const chartData = userMetrics
    .filter(u => u.tasksAssigned > 0)
    .sort((a, b) => b.tasksAssigned - a.tasksAssigned)
    .slice(0, 8) // Top 8 users
    .map(user => ({
      name: user.name.split(' ')[0], // First name only
      fullName: user.name,
      'A Fazer': user.tasksTodo,
      'Em Progresso': user.tasksInProgress,
      'Em Revisão': user.tasksInReview,
      'Concluída': user.tasksCompleted,
      total: user.tasksAssigned
    }));

  const COLORS = {
    'A Fazer': 'hsl(var(--muted-foreground))',
    'Em Progresso': 'hsl(217, 91%, 60%)', // blue
    'Em Revisão': 'hsl(271, 91%, 65%)', // purple
    'Concluída': 'hsl(142, 71%, 45%)' // green
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Distribuição de Carga
          </CardTitle>
          <CardDescription>
            Carga de trabalho por usuário e status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum dado disponível para exibir
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Distribuição de Carga
        </CardTitle>
        <CardDescription>
          Carga de trabalho por usuário e status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={80}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
                labelFormatter={(label) => {
                  const user = chartData.find(d => d.name === label);
                  return user?.fullName || label;
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))'
                }}
              />
              <Legend />
              <Bar 
                dataKey="A Fazer" 
                stackId="a" 
                fill={COLORS['A Fazer']}
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="Em Progresso" 
                stackId="a" 
                fill={COLORS['Em Progresso']}
              />
              <Bar 
                dataKey="Em Revisão" 
                stackId="a" 
                fill={COLORS['Em Revisão']}
              />
              <Bar 
                dataKey="Concluída" 
                stackId="a" 
                fill={COLORS['Concluída']}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
