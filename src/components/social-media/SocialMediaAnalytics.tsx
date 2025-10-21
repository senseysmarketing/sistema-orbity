import { useMemo, useEffect, useState } from "react";
import { useSocialMediaPosts } from "@/hooks/useSocialMediaPosts";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  TrendingUp, 
  BarChart3,
  Users,
  Target,
  Activity,
  Zap,
  AlertTriangle,
  Archive
} from "lucide-react";

export function SocialMediaAnalytics() {
  const { posts } = useSocialMediaPosts();
  const { currentAgency } = useAgency();
  const [yesterdayArchivedCount, setYesterdayArchivedCount] = useState(0);

  // Buscar posts arquivados no dia anterior
  useEffect(() => {
    const fetchArchivedYesterday = async () => {
      if (!currentAgency?.id) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('social_media_posts')
        .select('id')
        .eq('agency_id', currentAgency.id)
        .eq('archived', true)
        .gte('archived_at', yesterday.toISOString())
        .lt('archived_at', today.toISOString());

      if (!error && data) {
        setYesterdayArchivedCount(data.length);
      }
    };

    fetchArchivedYesterday();
  }, [currentAgency?.id]);

  const analytics = useMemo(() => {
    const today = new Date();
    const thisWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Estatísticas por status
    const statusStats = {
      draft: posts.filter(p => p.status === 'draft').length,
      in_creation: posts.filter(p => p.status === 'in_creation').length,
      pending_approval: posts.filter(p => p.status === 'pending_approval').length,
      approved: posts.filter(p => p.status === 'approved').length,
      published: posts.filter(p => p.status === 'published').length,
    };

    // Estatísticas por plataforma
    const platformStats: { [key: string]: number } = {};
    posts.forEach(post => {
      platformStats[post.platform] = (platformStats[post.platform] || 0) + 1;
    });

    // Estatísticas por tipo de conteúdo
    const contentTypeStats: { [key: string]: number } = {};
    posts.forEach(post => {
      contentTypeStats[post.post_type] = (contentTypeStats[post.post_type] || 0) + 1;
    });

    // Postagens agendadas para hoje
    const scheduledToday = posts.filter(p => {
      const scheduledDate = new Date(p.scheduled_date);
      return scheduledDate.toDateString() === today.toDateString() && 
             p.status !== 'published';
    });

    // Postagens agendadas para amanhã
    const scheduledTomorrow = posts.filter(p => {
      const scheduledDate = new Date(p.scheduled_date);
      return scheduledDate.toDateString() === tomorrow.toDateString() && 
             p.status !== 'published';
    });

    // Postagens agendadas para esta semana
    const scheduledThisWeek = posts.filter(p => {
      const scheduledDate = new Date(p.scheduled_date);
      return scheduledDate >= today && scheduledDate <= thisWeek && 
             p.status !== 'published';
    });

    // Postagens atrasadas (deveriam ter sido publicadas mas ainda não foram)
    const overduePosts = posts.filter(p => {
      const scheduledDate = new Date(p.scheduled_date);
      return scheduledDate < today && p.status !== 'published';
    });

    // Postagens aguardando aprovação
    const pendingApproval = posts.filter(p => p.status === 'pending_approval');

    // Taxa de conclusão
    const total = posts.length;
    const completed = statusStats.published;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Estatísticas por cliente
    const clientStats: { [key: string]: { name: string; count: number } } = {};
    posts.forEach(post => {
      if (post.client_id && post.clients) {
        if (!clientStats[post.client_id]) {
          clientStats[post.client_id] = {
            name: post.clients.name,
            count: 0
          };
        }
        clientStats[post.client_id].count++;
      }
    });

    // Estatísticas por prioridade
    const priorityStats = {
      high: posts.filter(p => p.priority === 'high').length,
      medium: posts.filter(p => p.priority === 'medium').length,
      low: posts.filter(p => p.priority === 'low').length,
    };

    return {
      total,
      statusStats,
      platformStats,
      contentTypeStats,
      scheduledToday,
      scheduledTomorrow,
      scheduledThisWeek,
      overduePosts,
      pendingApproval,
      completionRate,
      clientStats,
      priorityStats,
    };
  }, [posts]);

  const getPlatformIcon = (platform: string) => {
    const icons: { [key: string]: string } = {
      instagram: '📷',
      facebook: '👥',
      linkedin: '💼',
      twitter: '🐦',
      tiktok: '🎵',
      youtube: '📺',
    };
    return icons[platform] || '📱';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Análises e Insights</h2>
        <p className="text-muted-foreground">
          Visão geral do desempenho e status das postagens
        </p>
      </div>

      {/* Cards principais de métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Postagens</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.statusStats.published} publicadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.completionRate}%</div>
            <Progress value={analytics.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando Aprovação</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.pendingApproval.length}</div>
            <p className="text-xs text-muted-foreground">
              Requer atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Postagens Atrasadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {analytics.overduePosts.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Necessitam atenção urgente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vencimentos próximos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agendamentos Próximos
            </CardTitle>
            <CardDescription>
              Postagens programadas para os próximos dias
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Hoje</span>
                <Badge variant={analytics.scheduledToday.length > 0 ? "default" : "secondary"}>
                  {analytics.scheduledToday.length} postagens
                </Badge>
              </div>
              {analytics.scheduledToday.length > 0 && (
                <div className="space-y-1 pl-4">
                  {analytics.scheduledToday.slice(0, 3).map(post => (
                    <div key={post.id} className="flex items-center gap-2 text-sm">
                      <span>{getPlatformIcon(post.platform)}</span>
                      <span className="truncate">{post.title}</span>
                    </div>
                  ))}
                  {analytics.scheduledToday.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{analytics.scheduledToday.length - 3} mais
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Amanhã</span>
                <Badge variant="secondary">
                  {analytics.scheduledTomorrow.length} postagens
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Esta Semana</span>
                <Badge variant="secondary">
                  {analytics.scheduledThisWeek.length} postagens
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Itens que Precisam de Atenção
            </CardTitle>
            <CardDescription>
              Postagens com alertas ou pendências
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analytics.overduePosts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-destructive">Atrasadas</span>
                  <Badge variant="destructive">
                    {analytics.overduePosts.length}
                  </Badge>
                </div>
                <div className="space-y-1 pl-4">
                  {analytics.overduePosts.slice(0, 3).map(post => (
                    <div key={post.id} className="flex items-center gap-2 text-sm">
                      <span>{getPlatformIcon(post.platform)}</span>
                      <span className="truncate">{post.title}</span>
                    </div>
                  ))}
                  {analytics.overduePosts.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{analytics.overduePosts.length - 3} mais
                    </p>
                  )}
                </div>
              </div>
            )}

            {analytics.pendingApproval.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Aguardando Aprovação</span>
                  <Badge variant="outline">
                    {analytics.pendingApproval.length}
                  </Badge>
                </div>
              </div>
            )}

            {analytics.statusStats.draft > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Em Briefing</span>
                  <Badge variant="secondary">
                    {analytics.statusStats.draft}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas detalhadas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Briefing</span>
              <Badge className="bg-gray-500">{analytics.statusStats.draft}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Em Criação</span>
              <Badge className="bg-blue-500">{analytics.statusStats.in_creation}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Aguardando Aprovação</span>
              <Badge className="bg-yellow-500">{analytics.statusStats.pending_approval}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Aprovado</span>
              <Badge className="bg-green-500">{analytics.statusStats.approved}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Publicado</span>
              <Badge className="bg-purple-500">{analytics.statusStats.published}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Por Plataforma
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(analytics.platformStats)
              .sort(([, a], [, b]) => b - a)
              .map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-2">
                    <span>{getPlatformIcon(platform)}</span>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Alta</span>
              <Badge className="bg-red-500">{analytics.priorityStats.high}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Média</span>
              <Badge className="bg-yellow-500">{analytics.priorityStats.medium}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Baixa</span>
              <Badge className="bg-gray-500">{analytics.priorityStats.low}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas por cliente */}
      {Object.keys(analytics.clientStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Por Cliente
            </CardTitle>
            <CardDescription>
              Distribuição de postagens por cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.clientStats)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([clientId, data]) => (
                  <div key={clientId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{data.name}</span>
                      <span className="text-muted-foreground">{data.count} postagens</span>
                    </div>
                    <Progress 
                      value={(data.count / analytics.total) * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Insights e Recomendações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {yesterdayArchivedCount > 0 && (
            <div className="flex items-start gap-3 p-3 border rounded-lg bg-blue-500/10">
              <Archive className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Posts Arquivados Automaticamente</p>
                <p className="text-sm text-muted-foreground">
                  {yesterdayArchivedCount} postagem(ns) publicada(s) foi(ram) arquivada(s) ontem automaticamente. 
                  Posts publicados há mais de 7 dias são arquivados automaticamente para manter o sistema organizado.
                </p>
              </div>
            </div>
          )}
          {analytics.overduePosts.length > 0 && (
            <div className="flex items-start gap-3 p-3 border rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Atenção: Postagens Atrasadas</p>
                <p className="text-sm text-muted-foreground">
                  Você tem {analytics.overduePosts.length} postagem(ns) com data de publicação vencida. 
                  Revise e reagende ou publique o quanto antes.
                </p>
              </div>
            </div>
          )}

          {analytics.pendingApproval.length > 0 && (
            <div className="flex items-start gap-3 p-3 border rounded-lg bg-yellow-500/10">
              <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Aprovações Pendentes</p>
                <p className="text-sm text-muted-foreground">
                  {analytics.pendingApproval.length} postagem(ns) aguardando aprovação. 
                  Revise para manter o fluxo de trabalho em dia.
                </p>
              </div>
            </div>
          )}

          {analytics.scheduledToday.length > 0 && (
            <div className="flex items-start gap-3 p-3 border rounded-lg bg-blue-500/10">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Postagens Agendadas para Hoje</p>
                <p className="text-sm text-muted-foreground">
                  Você tem {analytics.scheduledToday.length} postagem(ns) agendadas para hoje. 
                  Certifique-se de que estão prontas para publicação.
                </p>
              </div>
            </div>
          )}

          {analytics.completionRate >= 80 && (
            <div className="flex items-start gap-3 p-3 border rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Ótimo Desempenho!</p>
                <p className="text-sm text-muted-foreground">
                  Sua taxa de conclusão está em {analytics.completionRate}%. Continue assim!
                </p>
              </div>
            </div>
          )}

          {analytics.statusStats.draft > 5 && (
            <div className="flex items-start gap-3 p-3 border rounded-lg">
              <Activity className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm">Muitos Briefings Pendentes</p>
                <p className="text-sm text-muted-foreground">
                  Você tem {analytics.statusStats.draft} postagens em briefing. 
                  Considere priorizar algumas para avançar no fluxo.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
