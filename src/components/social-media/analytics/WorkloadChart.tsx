import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { BarChart3 } from "lucide-react";
import { PostWithAssignments, ProfileData, StatusDistribution } from "./types";

interface WorkloadChartProps {
  posts: PostWithAssignments[];
  profiles: ProfileData[];
}

const STATUS_COLORS = {
  draft: 'hsl(var(--muted-foreground))',
  in_creation: 'hsl(217, 91%, 60%)',
  pending_approval: 'hsl(48, 96%, 53%)',
  approved: 'hsl(142, 71%, 45%)',
  published: 'hsl(280, 80%, 60%)',
};

const STATUS_LABELS = {
  draft: 'Briefing',
  in_creation: 'Em Criação',
  pending_approval: 'Aguardando',
  approved: 'Aprovado',
  published: 'Publicado',
};

export function WorkloadChart({ posts, profiles }: WorkloadChartProps) {
  const chartData = useMemo(() => {
    const userStatusMap = new Map<string, StatusDistribution & { name: string }>();

    // Initialize all profiles
    profiles.forEach(profile => {
      userStatusMap.set(profile.user_id, {
        name: profile.name?.split(' ')[0] || 'Usuário',
        draft: 0,
        in_creation: 0,
        pending_approval: 0,
        approved: 0,
        published: 0,
      });
    });

    // Count posts by user and status
    posts.filter(p => !p.archived).forEach(post => {
      post.post_assignments?.forEach(assignment => {
        const userData = userStatusMap.get(assignment.user_id);
        if (!userData) return;

        const status = post.status as keyof StatusDistribution;
        if (status in userData) {
          userData[status]++;
        }

        userStatusMap.set(assignment.user_id, userData);
      });
    });

    // Filter users with at least 1 post and sort by total
    return Array.from(userStatusMap.values())
      .map(user => ({
        ...user,
        total: user.draft + user.in_creation + user.pending_approval + user.approved + user.published
      }))
      .filter(user => user.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8); // Max 8 users
  }, [posts, profiles]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              entry.value > 0 && (
                <div key={index} className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-sm" 
                      style={{ backgroundColor: entry.color }}
                    />
                    <span>{entry.name}</span>
                  </div>
                  <span className="font-medium">{entry.value}</span>
                </div>
              )
            ))}
            <div className="border-t pt-1 mt-1 flex justify-between text-sm font-medium">
              <span>Total</span>
              <span>{total}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribuição de Carga
          </CardTitle>
          <CardDescription>
            Nenhum dado de carga disponível
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Distribuição de Carga por Usuário
        </CardTitle>
        <CardDescription>
          Visualização da carga de trabalho por status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
            >
              <XAxis type="number" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={75}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => <span className="text-xs">{value}</span>}
              />
              <Bar 
                dataKey="draft" 
                name={STATUS_LABELS.draft} 
                stackId="stack" 
                fill={STATUS_COLORS.draft}
                radius={[0, 0, 0, 0]}
              />
              <Bar 
                dataKey="in_creation" 
                name={STATUS_LABELS.in_creation} 
                stackId="stack" 
                fill={STATUS_COLORS.in_creation}
              />
              <Bar 
                dataKey="pending_approval" 
                name={STATUS_LABELS.pending_approval} 
                stackId="stack" 
                fill={STATUS_COLORS.pending_approval}
              />
              <Bar 
                dataKey="approved" 
                name={STATUS_LABELS.approved} 
                stackId="stack" 
                fill={STATUS_COLORS.approved}
              />
              <Bar 
                dataKey="published" 
                name={STATUS_LABELS.published} 
                stackId="stack" 
                fill={STATUS_COLORS.published}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
