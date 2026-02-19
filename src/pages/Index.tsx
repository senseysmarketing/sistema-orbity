import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { format, isToday, isBefore, startOfDay, isThisWeek, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { MyDayHeader } from '@/components/dashboard/MyDayHeader';
import { MyStatusCards } from '@/components/dashboard/MyStatusCards';
import { MyTasksList } from '@/components/dashboard/MyTasksList';
import { MyAgendaAndPosts } from '@/components/dashboard/MyAgendaAndPosts';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { startOfMonth as startMonth } from 'date-fns';

const Index = () => {
  const { profile } = useAuth();
  const { currentAgency, isAgencyAdmin } = useAgency();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isAdmin = isAgencyAdmin();

  const [loading, setLoading] = useState(true);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(() => {
    const saved = localStorage.getItem('dashboard_show_sensitive_data');
    return saved !== null ? saved === 'true' : false;
  });

  useEffect(() => {
    localStorage.setItem('dashboard_show_sensitive_data', String(showSensitiveData));
  }, [showSensitiveData]);

  // --- Personal data ---
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [myMeetings, setMyMeetings] = useState<any[]>([]);
  const [myPosts, setMyPosts] = useState<any[]>([]);

  // --- Agency-wide metrics (admins only) ---
  const [agencyMetrics, setAgencyMetrics] = useState({
    totalClients: 0,
    activeClients: 0,
    totalLeads: 0,
    convertedLeads: 0,
    totalMeetings: 0,
    upcomingMeetings: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    totalSocialPosts: 0,
    publishedPosts: 0,
    monthlyRevenue: 0,
    adSpend: 0,
  });

  const fetchMyData = useCallback(async () => {
    if (!profile || !currentAgency) return;
    setLoading(true);

    try {
      // 1. My task assignments
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('user_id', profile.user_id);

      const myTaskIds = assignments?.map((a: any) => a.task_id) || [];

      // Build task query — ONLY tasks assigned to the user
      let taskQuery = supabase
        .from('tasks')
        .select('*, clients(name)')
        .eq('agency_id', currentAgency.id);

      if (myTaskIds.length === 0) {
        // No assignments = no tasks in personal dashboard
        setMyTasks([]);
      } else {
        taskQuery = taskQuery.in('id', myTaskIds);
      }

      // 2. My post assignments
      const { data: postAssignments } = await supabase
        .from('post_assignments')
        .select('post_id')
        .eq('user_id', profile.user_id);

      const myPostIds = postAssignments?.map((a: any) => a.post_id) || [];

      // 3. Meetings (created by me or in my agency for today+)
      const todayStr = new Date().toISOString().split('T')[0];

      const [meetingsRes, postsRes] = await Promise.all([
        supabase
          .from('meetings')
          .select('*, clients(name)')
          .eq('agency_id', currentAgency.id)
          .gte('start_time', `${todayStr}T00:00:00`)
          .neq('status', 'cancelled')
          .order('start_time', { ascending: true })
          .limit(20),
        myPostIds.length > 0
          ? supabase
              .from('social_media_posts')
              .select('*, clients(name)')
              .eq('agency_id', currentAgency.id)
              .in('id', myPostIds)
              .neq('status', 'published')
          : Promise.resolve({ data: [] }),
      ]);

      if (myTaskIds.length > 0) {
        const tasksRes = await taskQuery;
        setMyTasks(tasksRes.data || []);
      }
      setMyMeetings(
        (meetingsRes.data || []).map((m: any) => ({
          ...m,
          client_name: m.clients?.name,
        }))
      );
      setMyPosts(
        ((postsRes as any).data || []).map((p: any) => ({
          ...p,
          client_name: p.clients?.name,
        }))
      );

      // Admin: fetch agency-wide metrics
      if (isAdmin) {
        await fetchAgencyMetrics();
      }
    } catch (error: any) {
      toast({ title: 'Erro ao carregar dados', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id, currentAgency?.id, isAdmin]);

  const fetchAgencyMetrics = async () => {
    if (!currentAgency) return;
    try {
      const [
        clientsRes,
        leadsRes,
        meetingsRes,
        tasksRes,
        postsRes,
        paymentsRes,
      ] = await Promise.all([
        supabase.from('clients').select('id,active').eq('agency_id', currentAgency.id),
        supabase.from('leads').select('id,status').eq('agency_id', currentAgency.id),
        supabase.from('meetings').select('id,start_time,status').eq('agency_id', currentAgency.id),
        supabase.from('tasks').select('id,status,due_date').eq('agency_id', currentAgency.id),
        supabase.from('social_media_posts').select('id,status').eq('agency_id', currentAgency.id),
        supabase.from('client_payments').select('amount,due_date,status,client_id').eq('agency_id', currentAgency.id),
      ]);

      const today = new Date();
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const clients = clientsRes.data || [];
      const leads = leadsRes.data || [];
      const meetings = meetingsRes.data || [];
      const tasks = tasksRes.data || [];
      const posts = postsRes.data || [];
      const payments = paymentsRes.data || [];

      const activeClientIds = clients.filter((c: any) => c.active).map((c: any) => c.id);
      const paymentsThisMonth = payments.filter((p: any) =>
        p.due_date >= startStr && p.due_date <= endStr && activeClientIds.includes(p.client_id)
      );
      const monthlyRevenue = paymentsThisMonth.reduce((s: number, p: any) => s + (p.amount || 0), 0);

      setAgencyMetrics({
        totalClients: clients.length,
        activeClients: clients.filter((c: any) => c.active).length,
        totalLeads: leads.length,
        convertedLeads: leads.filter((l: any) => l.status === 'client').length,
        totalMeetings: meetings.filter((m: any) => {
          const d = new Date(m.start_time);
          return d >= thisMonth && d < nextMonth;
        }).length,
        upcomingMeetings: meetings.filter((m: any) => new Date(m.start_time) >= today && m.status !== 'cancelled').length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t: any) => t.status === 'done').length,
        overdueTasks: tasks.filter((t: any) => {
          const d = t.due_date ? new Date(t.due_date) : null;
          return d && d < today && t.status !== 'done';
        }).length,
        totalSocialPosts: posts.length,
        publishedPosts: posts.filter((p: any) => p.status === 'published').length,
        monthlyRevenue,
        adSpend: 0,
      });
    } catch (err) {
      console.error('Error fetching agency metrics', err);
    }
  };

  useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  // --- Computed values from personal tasks ---
  const today = startOfDay(new Date());

  const todayTasks = myTasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    return isToday(new Date(t.due_date));
  });

  const overdueTasks = myTasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false;
    return isBefore(startOfDay(new Date(t.due_date)), today);
  });

  const doneTodayTasks = myTasks.filter(t => {
    if (t.status !== 'done' || !t.due_date) return false;
    return isToday(new Date(t.due_date));
  });

  const todayMeetings = myMeetings.filter(m => isToday(new Date(m.start_time)));
  const nextMeeting = todayMeetings[0] || null;
  const nextMeetingTime = nextMeeting
    ? format(new Date(nextMeeting.start_time), 'HH:mm')
    : null;

  const postsToReview = myPosts.filter(p =>
    ['pending_approval', 'revision'].includes(p.status)
  );

  // Tasks visible in list: overdue + today + this week (not done)
  const visibleTasks = myTasks.filter(t => {
    if (t.status === 'done') return false;
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return isBefore(startOfDay(d), startOfDay(addDays(new Date(), 7)));
  });

  function addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">

      {/* 1. Header personalizado "Meu Dia" */}
      <MyDayHeader
        userName={profile?.name || 'Usuário'}
        agencyName={currentAgency?.name || ''}
        avatarUrl={profile?.avatar_url}
        todayTasksTotal={todayTasks.length + doneTodayTasks.length}
        todayTasksDone={doneTodayTasks.length}
        overdueCount={overdueTasks.length}
      />

      {/* 2. Cards de status pessoal */}
      <MyStatusCards
        todayTasksCount={todayTasks.length}
        overdueTasksCount={overdueTasks.length}
        nextMeetingTime={nextMeetingTime}
        postsToReviewCount={postsToReview.length}
        onCardClick={(section) => {
          if (section === 'tasks' || section === 'overdue') navigate('/dashboard/tasks');
          if (section === 'meeting') navigate('/dashboard/agenda');
          if (section === 'posts') navigate('/dashboard/social-media');
        }}
      />

      {/* 3. Grid principal: Tarefas | Agenda & Posts */}
      <div className="grid gap-4 md:grid-cols-2">
        <MyTasksList
          tasks={visibleTasks}
          onTasksChange={fetchMyData}
          onViewAll={() => navigate('/dashboard/tasks')}
        />
        <MyAgendaAndPosts
          meetings={myMeetings}
          posts={myPosts}
          onViewAgenda={() => navigate('/dashboard/agenda')}
          onViewPosts={() => navigate('/dashboard/social-media')}
        />
      </div>

      {/* 4. Ações Rápidas */}
      <QuickActions />

      {/* 5. Métricas da Agência — apenas admins, colapsável */}
      {isAdmin && (
        <Collapsible open={metricsOpen} onOpenChange={setMetricsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <BarChart3 className="h-4 w-4" />
              Métricas da Agência
              {metricsOpen ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <DashboardMetrics
              metrics={agencyMetrics}
              showSensitiveData={showSensitiveData}
              onToggleSensitiveData={() => setShowSensitiveData(!showSensitiveData)}
              isAdmin={isAdmin}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default Index;
