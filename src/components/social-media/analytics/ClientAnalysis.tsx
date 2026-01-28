import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, AlertTriangle, Calendar, CheckCircle } from "lucide-react";
import { ClientMetrics, PostWithAssignments } from "./types";
import { isAfter, isBefore, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientAnalysisProps {
  posts: PostWithAssignments[];
}

export function ClientAnalysis({ posts }: ClientAnalysisProps) {
  const clientMetrics = useMemo(() => {
    const metricsMap = new Map<string, ClientMetrics>();
    const today = new Date();
    const activePosts = posts.filter(p => !p.archived);

    activePosts.forEach(post => {
      if (!post.client_id || !post.clients) return;

      const clientId = post.client_id;
      const existing = metricsMap.get(clientId) || {
        clientId,
        name: post.clients.name,
        totalPosts: 0,
        publishedPosts: 0,
        upcomingPosts: 0,
        overduePosts: 0,
        nextScheduledDate: null,
        completionRate: 0,
        platforms: [],
      };

      existing.totalPosts++;

      if (post.status === 'published') {
        existing.publishedPosts++;
      }

      const scheduledDate = new Date(post.scheduled_date);
      
      if (post.status !== 'published') {
        if (isAfter(scheduledDate, today)) {
          existing.upcomingPosts++;
          if (!existing.nextScheduledDate || isBefore(scheduledDate, existing.nextScheduledDate)) {
            existing.nextScheduledDate = scheduledDate;
          }
        } else {
          existing.overduePosts++;
        }
      }

      if (!existing.platforms.includes(post.platform)) {
        existing.platforms.push(post.platform);
      }

      metricsMap.set(clientId, existing);
    });

    // Calculate completion rates
    metricsMap.forEach(metrics => {
      if (metrics.totalPosts > 0) {
        metrics.completionRate = Math.round((metrics.publishedPosts / metrics.totalPosts) * 100);
      }
    });

    return Array.from(metricsMap.values())
      .sort((a, b) => b.totalPosts - a.totalPosts);
  }, [posts]);

  const clientsNeedingAttention = useMemo(() => {
    return clientMetrics.filter(c => 
      c.completionRate < 50 || 
      c.overduePosts > 0 || 
      (!c.nextScheduledDate && c.totalPosts > 0)
    );
  }, [clientMetrics]);

  const getPlatformBadges = (platforms: string[]) => {
    const platformLabels: { [key: string]: string } = {
      instagram: 'IG',
      facebook: 'FB',
      linkedin: 'LI',
      twitter: 'TW',
      tiktok: 'TT',
      youtube: 'YT',
    };

    return platforms.slice(0, 3).map(p => (
      <Badge key={p} variant="outline" className="text-xs px-1.5">
        {platformLabels[p] || p.slice(0, 2).toUpperCase()}
      </Badge>
    ));
  };

  const getNextDateLabel = (date: Date | null) => {
    if (!date) return 'Sem agendamento';
    
    const today = new Date();
    const tomorrow = addDays(today, 1);
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Hoje';
    }
    if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) {
      return 'Amanhã';
    }
    
    const daysUntil = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 7) {
      return `Em ${daysUntil}d`;
    }
    
    return format(date, "dd MMM", { locale: ptBR });
  };

  if (clientMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Análise por Cliente
          </CardTitle>
          <CardDescription>
            Nenhum post associado a clientes neste período
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Ranking de Clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ranking de Clientes
          </CardTitle>
          <CardDescription>
            Distribuição de posts por cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientMetrics.slice(0, 6).map((client, index) => (
              <div key={client.clientId} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {client.overduePosts > 0 && (
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">
                      {client.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex gap-1">
                      {getPlatformBadges(client.platforms)}
                    </div>
                    <Badge 
                      variant={client.completionRate >= 70 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {client.completionRate}%
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={client.completionRate} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground w-16 text-right">
                    {client.publishedPosts}/{client.totalPosts} posts
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{getNextDateLabel(client.nextScheduledDate)}</span>
                  </div>
                  {client.upcomingPosts > 0 && (
                    <span>{client.upcomingPosts} pendente(s)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clientes que Precisam de Atenção */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Clientes que Precisam de Atenção
          </CardTitle>
          <CardDescription>
            Clientes com baixa taxa de conclusão ou posts atrasados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientsNeedingAttention.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-sm">Tudo em ordem!</p>
                <p className="text-xs text-muted-foreground">
                  Todos os clientes estão com bom desempenho
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {clientsNeedingAttention.slice(0, 5).map(client => (
                <div 
                  key={client.clientId}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{client.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {client.overduePosts > 0 && (
                          <span className="text-destructive">
                            {client.overduePosts} atrasado(s)
                          </span>
                        )}
                        {client.completionRate < 50 && (
                          <span>
                            Taxa: {client.completionRate}%
                          </span>
                        )}
                        {!client.nextScheduledDate && (
                          <span>
                            Sem agendamento
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {client.totalPosts} posts
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
