import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ExternalLink } from "lucide-react";
import { ClientWeekPlan, categorizeStatus } from "./types";
import { SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";

interface ClientPlanningDetailsProps {
  plan: ClientWeekPlan | null;
  open: boolean;
  onClose: () => void;
  onCreatePost: (clientId: string) => void;
  onViewPost: (post: SocialMediaPost) => void;
  weekDays: Date[];
}

export function ClientPlanningDetails({ 
  plan, 
  open, 
  onClose, 
  onCreatePost,
  onViewPost,
  weekDays 
}: ClientPlanningDetailsProps) {
  const { currentAgency } = useAgency();

  // Fetch custom statuses for UUID translation
  const { data: customStatuses = [] } = useQuery({
    queryKey: ['social-media-custom-statuses', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data } = await supabase
        .from('social_media_custom_statuses')
        .select('id, name, slug, color')
        .eq('agency_id', currentAgency.id);
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  // Build dynamic status map with defaults + custom statuses
  const statusMap = useMemo(() => {
    const map: Record<string, { label: string }> = {
      draft: { label: 'Briefing' },
      briefing: { label: 'Briefing' },
      in_creation: { label: 'Em Criação' },
      pending_approval: { label: 'Aguardando Aprovação' },
      approved: { label: 'Aprovado' },
      published: { label: 'Publicado' },
      revision: { label: 'Em Revisão' },
    };
    
    customStatuses.forEach(status => {
      map[status.id] = { label: status.name };
      map[status.slug] = { label: status.name };
    });
    
    return map;
  }, [customStatuses]);

  if (!plan) return null;

  const allPosts = Object.values(plan.days).flatMap(d => d.posts);
  const platforms = [...new Set(allPosts.map(p => p.platform))];

  const getStatusBadge = (status: string) => {
    const statusInfo = statusMap[status] || { label: status };
    const category = categorizeStatus(status);
    const colors = {
      ready: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      inProgress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      draft: "bg-muted text-muted-foreground",
    };
    return <Badge className={colors[category]}>{statusInfo.label}</Badge>;
  };

  const getOverallBadge = () => {
    if (plan.weekTotal === 0) {
      return <Badge variant="destructive">Sem Conteúdo</Badge>;
    }
    if (plan.readinessPercentage >= 100) {
      return <Badge className="bg-green-600">Pronto</Badge>;
    }
    if (plan.readinessPercentage >= 50) {
      return <Badge className="bg-amber-500">Em Progresso</Badge>;
    }
    return <Badge variant="destructive">Atenção</Badge>;
  };

  // Group posts by day
  const postsByDay = weekDays.map(day => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayData = plan.days[dateKey];
    return {
      date: day,
      dateKey,
      posts: dayData?.posts || [],
    };
  }).filter(d => d.posts.length > 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full">
        <SheetHeader className="space-y-3 shrink-0">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="text-left">{plan.clientName}</SheetTitle>
            {getOverallBadge()}
          </div>
        </SheetHeader>

        <div className="mt-6 flex-1 flex flex-col min-h-0 space-y-6">
          {/* Summary */}
          <div className="space-y-3 shrink-0">
            <h4 className="text-sm font-medium">Resumo da Semana</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Prontidão</span>
                <span className="font-medium">{plan.readyCount}/{plan.weekTotal} posts</span>
              </div>
              <Progress value={plan.readinessPercentage} className="h-2" />
            </div>
            {platforms.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {platforms.map(p => (
                  <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Posts by day */}
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <h4 className="text-sm font-medium shrink-0">Posts da Semana</h4>
            <ScrollArea className="flex-1 pr-4">
              {postsByDay.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum post programado para esta semana
                </p>
              ) : (
                <div className="space-y-4">
                  {postsByDay.map(({ date, posts }) => (
                    <div key={date.toISOString()} className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                      </p>
                      {posts.map(post => (
                        <div
                          key={post.id}
                          className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => onViewPost(post)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{post.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px]">{post.platform}</Badge>
                                {getStatusBadge(post.status)}
                              </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Quick actions */}
          <div className="shrink-0 space-y-2 pt-4 border-t">
            <Button 
              className="w-full" 
              onClick={() => onCreatePost(plan.clientId)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Post para {plan.clientName}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
