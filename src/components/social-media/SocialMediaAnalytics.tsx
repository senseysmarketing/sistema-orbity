import { useEffect, useState, useMemo } from "react";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Archive, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PostWithAssignments, ProfileData } from "./analytics/types";
import { MetricsCards } from "./analytics/MetricsCards";
import { TeamPerformanceTable } from "./analytics/TeamPerformanceTable";
import { WorkloadChart } from "./analytics/WorkloadChart";
import { SmartInsights } from "./analytics/SmartInsights";
import { ClientAnalysis } from "./analytics/ClientAnalysis";
import { mapTaskStatusToSocial } from "@/hooks/useSocialMediaTasks";

export function SocialMediaAnalytics() {
  const { currentAgency } = useAgency();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [monthPosts, setMonthPosts] = useState<PostWithAssignments[]>([]);
  const [previousMonthPosts, setPreviousMonthPosts] = useState<PostWithAssignments[]>([]);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);

  const handlePreviousMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  };

  // Fetch tasks with type 'redes_sociais' for selected month
  useEffect(() => {
    const fetchData = async () => {
      if (!currentAgency?.id) return;

      setLoading(true);
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      const prevMonthStart = startOfMonth(subMonths(selectedMonth, 1));
      const prevMonthEnd = endOfMonth(subMonths(selectedMonth, 1));

      const [tasksResult, prevTasksResult, agencyUsersResult] = await Promise.all([
        supabase
          .from('tasks')
          .select(`
            id,
            title,
            status,
            priority,
            due_date,
            created_at,
            archived,
            metadata,
            task_clients(client_id, clients(name)),
            task_assignments(user_id)
          `)
          .eq('agency_id', currentAgency.id)
          .eq('task_type', 'redes_sociais')
          .gte('due_date', monthStart.toISOString())
          .lte('due_date', monthEnd.toISOString()),
        supabase
          .from('tasks')
          .select(`
            id,
            status,
            archived
          `)
          .eq('agency_id', currentAgency.id)
          .eq('task_type', 'redes_sociais')
          .gte('due_date', prevMonthStart.toISOString())
          .lte('due_date', prevMonthEnd.toISOString()),
        supabase
          .from('agency_users')
          .select('user_id')
          .eq('agency_id', currentAgency.id)
      ]);

      if (tasksResult.data) {
        // Map tasks to PostWithAssignments format for analytics components
        const mapped: PostWithAssignments[] = tasksResult.data.map((task: any) => {
          const meta = task.metadata || {};
          const postDate = meta.post_date || null;
          const platform = meta.platform || '';
          const postType = meta.post_type || '';
          const firstClient = task.task_clients?.[0];
          const mappedStatus = mapTaskStatusToSocial(task.status);

          return {
            id: task.id,
            title: task.title || '',
            status: mappedStatus,
            priority: task.priority || 'medium',
            platform,
            post_type: postType,
            client_id: firstClient?.client_id || null,
            scheduled_date: postDate || task.due_date || task.created_at,
            post_date: postDate,
            created_at: task.created_at,
            archived: task.archived || false,
            clients: firstClient?.clients || null,
            post_assignments: (task.task_assignments || []).map((a: any) => ({ user_id: a.user_id })),
          };
        });
        setMonthPosts(mapped);
      }

      if (prevTasksResult.data) {
        setPreviousMonthPosts(prevTasksResult.data.map((p: any) => ({
          id: p.id,
          status: mapTaskStatusToSocial(p.status),
          archived: p.archived || false,
          title: '',
          priority: '',
          platform: '',
          post_type: '',
          client_id: null,
          scheduled_date: '',
          post_date: null,
          created_at: '',
        })) as PostWithAssignments[]);
      }

      // Fetch profiles for agency users
      if (agencyUsersResult.data && agencyUsersResult.data.length > 0) {
        const userIds = agencyUsersResult.data.map(u => u.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, avatar_url')
          .in('user_id', userIds);

        if (profilesData) {
          setProfiles(profilesData);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [currentAgency?.id, selectedMonth]);

  // Calculate previous month completion rate
  const previousMonthCompletionRate = useMemo(() => {
    const activePrev = previousMonthPosts.filter(p => !p.archived);
    if (activePrev.length === 0) return undefined;
    const published = activePrev.filter(p => p.status === 'published').length;
    return Math.round((published / activePrev.length) * 100);
  }, [previousMonthPosts]);

  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with month selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Análises e Insights</h2>
          <p className="text-sm text-muted-foreground">
            Dashboard de produtividade da equipe e clientes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[120px] sm:min-w-[150px] text-center">
            <span className="text-sm sm:text-lg font-semibold capitalize">
              {format(selectedMonth, "MMM yyyy", { locale: ptBR })}
            </span>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-9 w-9">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Historical month indicator */}
      {!isCurrentMonth && (
        <div className="flex items-center gap-2 p-2 sm:p-3 rounded-lg bg-muted/50 border">
          <Archive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs sm:text-sm text-muted-foreground">
            Visualizando dados de {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      )}

      <MetricsCards 
        posts={monthPosts} 
        teamSize={profiles.length}
        previousMonthCompletionRate={previousMonthCompletionRate}
      />

      <TeamPerformanceTable 
        posts={monthPosts} 
        profiles={profiles}
        teamSize={profiles.length}
      />

      <WorkloadChart 
        posts={monthPosts} 
        profiles={profiles}
      />

      <SmartInsights 
        posts={monthPosts} 
        profiles={profiles}
        previousMonthCompletionRate={previousMonthCompletionRate}
      />

      <ClientAnalysis posts={monthPosts} />
    </div>
  );
}
