import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Lightbulb, 
  AlertTriangle, 
  Clock, 
  Users, 
  Calendar, 
  Trophy,
  TrendingDown,
  Target,
  AlertCircle
} from "lucide-react";
import { SmartInsight, PostWithAssignments, ProfileData, UserMetrics } from "./types";
import { differenceInDays, differenceInHours, isAfter, isBefore, addDays } from "date-fns";

interface SmartInsightsProps {
  posts: PostWithAssignments[];
  profiles: ProfileData[];
  previousMonthCompletionRate?: number;
}

export function SmartInsights({ posts, profiles, previousMonthCompletionRate }: SmartInsightsProps) {
  const insights = useMemo(() => {
    const result: SmartInsight[] = [];
    const today = new Date();
    const activePosts = posts.filter(p => !p.archived);

    // 1. Approval bottleneck - posts pending approval for > 48h
    const pendingApproval = activePosts.filter(p => p.status === 'pending_approval');
    const oldPending = pendingApproval.filter(p => {
      const scheduledDate = new Date(p.scheduled_date);
      return differenceInHours(today, scheduledDate) > 48;
    });
    
    if (oldPending.length > 0) {
      result.push({
        id: 'approval-bottleneck',
        type: 'warning',
        category: 'Gargalo de Aprovação',
        icon: 'clock',
        title: 'Posts aguardando aprovação',
        message: `${oldPending.length} post(s) aguardam aprovação há mais de 2 dias. Considere revisar o fluxo de aprovação.`,
        actionUrl: '/dashboard/social-media?status=pending_approval',
        actionLabel: 'Ver posts'
      });
    }

    // 2. Workload imbalance
    const userPostCounts = new Map<string, number>();
    activePosts.forEach(post => {
      post.post_assignments?.forEach(a => {
        const count = userPostCounts.get(a.user_id) || 0;
        userPostCounts.set(a.user_id, count + 1);
      });
    });

    const counts = Array.from(userPostCounts.values());
    if (counts.length >= 2) {
      const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length;
      const maxCount = Math.max(...counts);
      const maxUserId = Array.from(userPostCounts.entries()).find(([, c]) => c === maxCount)?.[0];
      const maxUserName = profiles.find(p => p.user_id === maxUserId)?.name || 'Usuário';

      if (maxCount > avgCount * 1.4 && avgCount > 2) {
        result.push({
          id: 'workload-imbalance',
          type: 'info',
          category: 'Distribuição de Carga',
          icon: 'users',
          title: 'Distribuição desigual de posts',
          message: `${maxUserName} tem ${Math.round((maxCount / avgCount - 1) * 100)}% mais posts que a média (${maxCount} vs ~${Math.round(avgCount)}). Considere redistribuir.`,
        });
      }
    }

    // 3. Clients without scheduled content
    const clientIds = new Set(activePosts.map(p => p.client_id).filter(Boolean));
    const clientsWithUpcoming = new Set<string>();
    const next7Days = addDays(today, 7);

    activePosts.forEach(post => {
      if (post.client_id && post.status !== 'published') {
        const scheduledDate = new Date(post.scheduled_date);
        if (isAfter(scheduledDate, today) && isBefore(scheduledDate, next7Days)) {
          clientsWithUpcoming.add(post.client_id);
        }
      }
    });

    const clientsNeedingAttention = Array.from(clientIds).filter(
      id => id && !clientsWithUpcoming.has(id)
    );

    if (clientsNeedingAttention.length > 0) {
      const clientNames = clientsNeedingAttention
        .map(id => activePosts.find(p => p.client_id === id)?.clients?.name)
        .filter(Boolean)
        .slice(0, 2);

      result.push({
        id: 'neglected-clients',
        type: 'alert',
        category: 'Cliente sem Conteúdo',
        icon: 'target',
        title: 'Clientes precisam de atenção',
        message: `${clientNames.join(', ')}${clientsNeedingAttention.length > 2 ? ` e mais ${clientsNeedingAttention.length - 2}` : ''} não ${clientsNeedingAttention.length === 1 ? 'tem' : 'têm'} posts agendados para os próximos 7 dias.`,
      });
    }

    // 4. Peak demand day
    const postsByDate = new Map<string, number>();
    activePosts.forEach(post => {
      if (post.status !== 'published') {
        const dateKey = post.scheduled_date.split('T')[0];
        postsByDate.set(dateKey, (postsByDate.get(dateKey) || 0) + 1);
      }
    });

    const peakDay = Array.from(postsByDate.entries())
      .filter(([date]) => isAfter(new Date(date), today))
      .sort(([, a], [, b]) => b - a)[0];

    if (peakDay && peakDay[1] >= 5) {
      const peakDate = new Date(peakDay[0]);
      result.push({
        id: 'peak-demand',
        type: 'info',
        category: 'Pico de Demanda',
        icon: 'calendar',
        title: 'Alto volume em uma data',
        message: `${peakDay[1]} posts agendados para ${peakDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}. Considere distribuir melhor.`,
      });
    }

    // 5. Top performer
    const userCompletionRates = new Map<string, { published: number; total: number }>();
    activePosts.forEach(post => {
      post.post_assignments?.forEach(a => {
        const stats = userCompletionRates.get(a.user_id) || { published: 0, total: 0 };
        stats.total++;
        if (post.status === 'published') stats.published++;
        userCompletionRates.set(a.user_id, stats);
      });
    });

    let topPerformer: { userId: string; rate: number } | null = null;
    userCompletionRates.forEach((stats, userId) => {
      if (stats.total >= 3) { // Minimum 3 posts
        const rate = (stats.published / stats.total) * 100;
        if (!topPerformer || rate > topPerformer.rate) {
          topPerformer = { userId, rate };
        }
      }
    });

    if (topPerformer && topPerformer.rate >= 85) {
      const performerName = profiles.find(p => p.user_id === topPerformer!.userId)?.name || 'Membro da equipe';
      result.push({
        id: 'top-performer',
        type: 'success',
        category: 'Destaque',
        icon: 'trophy',
        title: 'Melhor performer do período',
        message: `${performerName} teve ${Math.round(topPerformer.rate)}% de taxa de conclusão este mês. Parabéns! 🎉`,
      });
    }

    // 6. Overdue posts
    const overdue = activePosts.filter(p => {
      const scheduledDate = new Date(p.scheduled_date);
      return isBefore(scheduledDate, today) && p.status !== 'published';
    });

    if (overdue.length > 0) {
      result.push({
        id: 'overdue-posts',
        type: 'warning',
        category: 'Urgente',
        icon: 'alert',
        title: 'Posts atrasados',
        message: `${overdue.length} post(s) passaram da data de publicação sem serem publicados. Ação imediata necessária.`,
        actionUrl: '/dashboard/social-media',
        actionLabel: 'Resolver'
      });
    }

    // 7. Completion rate trend
    if (previousMonthCompletionRate !== undefined) {
      const currentPublished = activePosts.filter(p => p.status === 'published').length;
      const currentRate = activePosts.length > 0 ? (currentPublished / activePosts.length) * 100 : 0;
      const diff = currentRate - previousMonthCompletionRate;

      if (Math.abs(diff) >= 10) {
        result.push({
          id: 'completion-trend',
          type: diff > 0 ? 'success' : 'warning',
          category: 'Tendência',
          icon: diff > 0 ? 'trending-up' : 'trending-down',
          title: diff > 0 ? 'Taxa de conclusão melhorou!' : 'Taxa de conclusão caiu',
          message: `A taxa de conclusão ${diff > 0 ? 'subiu' : 'caiu'} ${Math.abs(Math.round(diff))}% em relação ao mês anterior.`,
        });
      }
    }

    return result;
  }, [posts, profiles, previousMonthCompletionRate]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'clock': return <Clock className="h-5 w-5" />;
      case 'users': return <Users className="h-5 w-5" />;
      case 'calendar': return <Calendar className="h-5 w-5" />;
      case 'trophy': return <Trophy className="h-5 w-5" />;
      case 'target': return <Target className="h-5 w-5" />;
      case 'alert': return <AlertCircle className="h-5 w-5" />;
      case 'trending-down': return <TrendingDown className="h-5 w-5" />;
      default: return <Lightbulb className="h-5 w-5" />;
    }
  };

  const getTypeStyles = (type: SmartInsight['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400';
      case 'alert':
        return 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400';
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400';
      case 'info':
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400';
    }
  };

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights e Recomendações
          </CardTitle>
          <CardDescription>
            Tudo em ordem! Nenhum insight ou alerta no momento.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Insights e Recomendações
        </CardTitle>
        <CardDescription>
          {insights.length} insight(s) identificado(s) com base nos dados do período
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map(insight => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border ${getTypeStyles(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {getIcon(insight.icon)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase tracking-wide opacity-75">
                      {insight.category}
                    </span>
                  </div>
                  <p className="font-semibold text-sm mb-1 text-foreground">
                    {insight.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
