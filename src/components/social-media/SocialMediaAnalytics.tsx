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

export function SocialMediaAnalytics() {
  const { currentAgency } = useAgency();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [monthPosts, setMonthPosts] = useState<PostWithAssignments[]>([]);
  const [previousMonthPosts, setPreviousMonthPosts] = useState<PostWithAssignments[]>([]);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigate between months
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

  // Fetch posts with assignments for selected month
  useEffect(() => {
    const fetchData = async () => {
      if (!currentAgency?.id) return;

      setLoading(true);
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      const prevMonthStart = startOfMonth(subMonths(selectedMonth, 1));
      const prevMonthEnd = endOfMonth(subMonths(selectedMonth, 1));

      // Fetch current month posts with assignments
      const [postsResult, prevPostsResult, agencyUsersResult] = await Promise.all([
        supabase
          .from('social_media_posts')
          .select(`
            id,
            title,
            status,
            priority,
            platform,
            post_type,
            client_id,
            scheduled_date,
            post_date,
            created_at,
            archived,
            clients(name),
            post_assignments(user_id)
          `)
          .eq('agency_id', currentAgency.id)
          .gte('scheduled_date', monthStart.toISOString())
          .lte('scheduled_date', monthEnd.toISOString()),
        supabase
          .from('social_media_posts')
          .select(`
            id,
            status,
            archived
          `)
          .eq('agency_id', currentAgency.id)
          .gte('scheduled_date', prevMonthStart.toISOString())
          .lte('scheduled_date', prevMonthEnd.toISOString()),
        supabase
          .from('agency_users')
          .select('user_id')
          .eq('agency_id', currentAgency.id)
      ]);

      if (postsResult.data) {
        setMonthPosts(postsResult.data as PostWithAssignments[]);
      }

      if (prevPostsResult.data) {
        // Cast to minimal type needed
        setPreviousMonthPosts(prevPostsResult.data.map(p => ({
          ...p,
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

      {/* Main metrics cards */}
      <MetricsCards 
        posts={monthPosts} 
        teamSize={profiles.length}
        previousMonthCompletionRate={previousMonthCompletionRate}
      />

      {/* Team Performance */}
      <TeamPerformanceTable 
        posts={monthPosts} 
        profiles={profiles}
        teamSize={profiles.length}
      />

      {/* Workload Distribution Chart */}
      <WorkloadChart 
        posts={monthPosts} 
        profiles={profiles}
      />

      {/* Smart Insights */}
      <SmartInsights 
        posts={monthPosts} 
        profiles={profiles}
        previousMonthCompletionRate={previousMonthCompletionRate}
      />

      {/* Client Analysis */}
      <ClientAnalysis posts={monthPosts} />
    </div>
  );
}
