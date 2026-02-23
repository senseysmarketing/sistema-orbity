import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, isSameMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";

// Analytics components
import { MetricsCards } from "./analytics/MetricsCards";
import { TeamPerformanceTable } from "./analytics/TeamPerformanceTable";
import { WorkloadChart } from "./analytics/WorkloadChart";
import { ClientAnalysis } from "./analytics/ClientAnalysis";
import { SmartInsights } from "./analytics/SmartInsights";
import { AIAnalysisCard } from "./analytics/AIAnalysisCard";
import { TypeBreakdownChart } from "./analytics/TypeBreakdownChart";
import { UserMetrics, ClientMetrics, TaskWithAssignments, Profile, TypeDistribution } from "./analytics/types";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  assigned_to: string | null;
  client_id: string | null;
  due_date: string | null;
  created_at: string;
  created_by: string;
  archived?: boolean;
}

interface TaskAnalyticsProps {
  tasks: Task[];
  profiles: { id: string; user_id: string; name: string; role: string }[];
  clients: { id: string; name: string }[];
  getAssignedUsers: (taskId: string) => any[];
}

export function TaskAnalytics({ tasks: currentTasks, profiles, clients, getAssignedUsers }: TaskAnalyticsProps) {
  const { currentAgency } = useAgency();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [monthTasks, setMonthTasks] = useState<TaskWithAssignments[]>([]);
  const [loadingMonthTasks, setLoadingMonthTasks] = useState(false);
  const [previousMonthRate, setPreviousMonthRate] = useState(0);
  const [agencyProfiles, setAgencyProfiles] = useState<Profile[]>([]);
  
  const isCurrentMonth = isSameMonth(selectedMonth, new Date());

  // Fetch agency users profiles
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!currentAgency?.id) return;
      
      const { data: agencyUsers } = await supabase
        .from('agency_users')
        .select('user_id')
        .eq('agency_id', currentAgency.id);
      
      if (agencyUsers && agencyUsers.length > 0) {
        const userIds = agencyUsers.map(u => u.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, avatar_url')
          .in('user_id', userIds);
        
        if (profilesData) {
          setAgencyProfiles(profilesData);
        }
      }
    };
    
    fetchProfiles();
  }, [currentAgency?.id]);

  // Fetch tasks for selected month
  useEffect(() => {
    const fetchMonthTasks = async () => {
      if (!currentAgency?.id) return;
      
      setLoadingMonthTasks(true);
      
      const monthStart = startOfMonth(selectedMonth);
      const monthEnd = endOfMonth(selectedMonth);
      
      // Fetch tasks with assignments
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, title, status, priority, client_id, due_date, 
          created_at, updated_at, archived, task_type,
          clients(name),
          task_assignments(user_id)
        `)
        .eq('agency_id', currentAgency.id)
        .or(`due_date.gte.${monthStart.toISOString()},created_at.gte.${monthStart.toISOString()}`)
        .or(`due_date.lte.${monthEnd.toISOString()},created_at.lte.${monthEnd.toISOString()}`);
      
      if (!error && data) {
        // Filter tasks that belong to this month
        const filteredTasks = data.filter(task => {
          const taskDate = task.due_date ? new Date(task.due_date) : new Date(task.created_at);
          return taskDate >= monthStart && taskDate <= monthEnd;
        });
        setMonthTasks(filteredTasks as TaskWithAssignments[]);
      }
      
      // Fetch previous month completion rate for comparison
      const prevMonthStart = startOfMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
      const prevMonthEnd = endOfMonth(prevMonthStart);
      
      const { data: prevData } = await supabase
        .from('tasks')
        .select('status')
        .eq('agency_id', currentAgency.id)
        .gte('due_date', prevMonthStart.toISOString())
        .lte('due_date', prevMonthEnd.toISOString());
      
      if (prevData && prevData.length > 0) {
        const prevCompleted = prevData.filter(t => t.status === 'done').length;
        setPreviousMonthRate(Math.round((prevCompleted / prevData.length) * 100));
      } else {
        setPreviousMonthRate(0);
      }
      
      setLoadingMonthTasks(false);
    };
    
    fetchMonthTasks();
  }, [currentAgency?.id, selectedMonth]);

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    const tasks = monthTasks;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Basic stats
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Unassigned tasks
    const unassigned = tasks.filter(t => 
      !t.task_assignments || t.task_assignments.length === 0
    ).length;

    // Overdue tasks
    const overdue = tasks.filter(t => {
      if (!t.due_date || t.status === 'done') return false;
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    }).length;

    // Average per user
    const usersWithTasks = new Set<string>();
    tasks.forEach(t => {
      t.task_assignments?.forEach(a => usersWithTasks.add(a.user_id));
    });
    const avgPerUser = usersWithTasks.size > 0 ? total / usersWithTasks.size : 0;

    // User metrics
    const userMetricsMap: Record<string, UserMetrics> = {};
    
    agencyProfiles.forEach(profile => {
      userMetricsMap[profile.user_id] = {
        userId: profile.user_id,
        name: profile.name,
        avatarUrl: profile.avatar_url || null,
        tasksAssigned: 0,
        tasksCompleted: 0,
        tasksInProgress: 0,
        tasksInReview: 0,
        tasksTodo: 0,
        completionRate: 0,
        avgTimeToComplete: 0,
        overdueCount: 0
      };
    });

    const completionTimes: Record<string, number[]> = {};

    tasks.forEach(task => {
      task.task_assignments?.forEach(assignment => {
        const userId = assignment.user_id;
        if (!userMetricsMap[userId]) {
          const profile = agencyProfiles.find(p => p.user_id === userId);
          userMetricsMap[userId] = {
            userId,
            name: profile?.name || 'Usuário',
            avatarUrl: profile?.avatar_url || null,
            tasksAssigned: 0,
            tasksCompleted: 0,
            tasksInProgress: 0,
            tasksInReview: 0,
            tasksTodo: 0,
            completionRate: 0,
            avgTimeToComplete: 0,
            overdueCount: 0
          };
        }

        userMetricsMap[userId].tasksAssigned++;

        switch (task.status) {
          case 'done':
            userMetricsMap[userId].tasksCompleted++;
            // Calculate time to complete
            if (task.updated_at && task.created_at) {
              const created = new Date(task.created_at);
              const updated = new Date(task.updated_at);
              const days = differenceInDays(updated, created);
              if (!completionTimes[userId]) completionTimes[userId] = [];
              completionTimes[userId].push(days);
            }
            break;
          case 'in_progress':
            userMetricsMap[userId].tasksInProgress++;
            break;
          case 'em_revisao':
            userMetricsMap[userId].tasksInReview++;
            break;
          case 'todo':
          default:
            userMetricsMap[userId].tasksTodo++;
        }

        // Check if overdue
        if (task.due_date && task.status !== 'done') {
          const dueDate = new Date(task.due_date);
          dueDate.setHours(0, 0, 0, 0);
          if (dueDate < today) {
            userMetricsMap[userId].overdueCount++;
          }
        }
      });
    });

    // Calculate completion rates and avg times
    Object.keys(userMetricsMap).forEach(userId => {
      const user = userMetricsMap[userId];
      user.completionRate = user.tasksAssigned > 0 
        ? Math.round((user.tasksCompleted / user.tasksAssigned) * 100) 
        : 0;
      
      if (completionTimes[userId] && completionTimes[userId].length > 0) {
        user.avgTimeToComplete = completionTimes[userId].reduce((a, b) => a + b, 0) / completionTimes[userId].length;
      }
    });

    const userMetrics = Object.values(userMetricsMap).filter(u => u.tasksAssigned > 0);

    // Client metrics
    const clientMetricsMap: Record<string, ClientMetrics> = {};

    tasks.forEach(task => {
      if (!task.client_id) return;
      
      const clientName = task.clients?.name || 'Cliente';
      
      if (!clientMetricsMap[task.client_id]) {
        clientMetricsMap[task.client_id] = {
          clientId: task.client_id,
          name: clientName,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          needsAttention: false
        };
      }

      clientMetricsMap[task.client_id].totalTasks++;

      if (task.status === 'done') {
        clientMetricsMap[task.client_id].completedTasks++;
      } else if (task.status === 'in_progress') {
        clientMetricsMap[task.client_id].inProgressTasks++;
      }

      // Check if overdue
      if (task.due_date && task.status !== 'done') {
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          clientMetricsMap[task.client_id].overdueTasks++;
        }
      }
    });

    // Calculate client completion rates
    Object.keys(clientMetricsMap).forEach(clientId => {
      const client = clientMetricsMap[clientId];
      client.completionRate = client.totalTasks > 0 
        ? Math.round((client.completedTasks / client.totalTasks) * 100) 
        : 0;
      client.needsAttention = client.completionRate < 50 || 
        (client.overdueTasks > 0 && client.overdueTasks >= client.totalTasks * 0.3);
    });

    const clientMetrics = Object.values(clientMetricsMap);

    // Tasks per day for peak detection
    const tasksPerDay: Record<string, number> = {};
    tasks.forEach(task => {
      if (task.due_date && task.status !== 'done') {
        const dateKey = format(new Date(task.due_date), 'dd/MM', { locale: ptBR });
        tasksPerDay[dateKey] = (tasksPerDay[dateKey] || 0) + 1;
      }
    });

    // Type distribution
    const TYPE_LABELS: Record<string, string> = {
      redes_sociais: 'Redes Sociais',
      criativos: 'Criativos',
      conteudo: 'Conteúdo',
      desenvolvimento: 'Desenvolvimento',
      suporte: 'Suporte',
      administrativo: 'Administrativo',
      reuniao: 'Reunião',
    };

    const typeCountMap: Record<string, number> = {};
    tasks.forEach(task => {
      const t = task.task_type || 'outros';
      typeCountMap[t] = (typeCountMap[t] || 0) + 1;
    });

    const typeDistribution: TypeDistribution[] = Object.entries(typeCountMap)
      .map(([type, count]) => ({
        type,
        label: TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Users with overdue tasks count
    const usersWithOverdue = userMetrics.filter(u => u.overdueCount > 0).length;

    return {
      total,
      completed,
      completionRate,
      unassigned,
      overdue,
      avgPerUser,
      userMetrics,
      clientMetrics,
      tasksPerDay,
      typeDistribution,
      usersWithOverdue
    };
  }, [monthTasks, agencyProfiles]);

  return (
    <div className="space-y-6">
      {/* Header with month selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold">Análises e Insights</h2>
          <p className="text-sm text-muted-foreground">
            Dashboard de produtividade da equipe
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[130px] sm:min-w-[150px] text-center">
            <span className="text-sm sm:text-lg font-semibold capitalize">
              {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleNextMonth} 
            disabled={isSameMonth(selectedMonth, new Date())} 
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Historical month indicator */}
      {!isCurrentMonth && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Visualizando dados de {format(selectedMonth, "MMMM 'de' yyyy", { locale: ptBR })}
          </span>
        </div>
      )}

      {/* Loading state */}
      {loadingMonthTasks && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!loadingMonthTasks && (
        <>
          {/* Metrics Cards */}
          <MetricsCards
            total={analyticsData.total}
            completed={analyticsData.completed}
            completionRate={analyticsData.completionRate}
            previousMonthRate={previousMonthRate}
            unassigned={analyticsData.unassigned}
            overdue={analyticsData.overdue}
            avgPerUser={analyticsData.avgPerUser}
            usersWithOverdue={analyticsData.usersWithOverdue}
          />

          {/* AI Analysis Card */}
          <AIAnalysisCard
            selectedMonth={selectedMonth}
            total={analyticsData.total}
            completed={analyticsData.completed}
            completionRate={analyticsData.completionRate}
            previousMonthRate={previousMonthRate}
            overdue={analyticsData.overdue}
            unassigned={analyticsData.unassigned}
            userMetrics={analyticsData.userMetrics}
            clientMetrics={analyticsData.clientMetrics}
            typeDistribution={analyticsData.typeDistribution}
            tasksPerDay={analyticsData.tasksPerDay}
            isCurrentMonth={isCurrentMonth}
          />

          {/* Team Performance Table */}
          <TeamPerformanceTable 
            userMetrics={analyticsData.userMetrics}
            isCurrentMonth={isCurrentMonth}
          />

          {/* Workload Chart */}
          <WorkloadChart userMetrics={analyticsData.userMetrics} />

          {/* Type Breakdown Chart */}
          <TypeBreakdownChart distribution={analyticsData.typeDistribution} />

          {/* Smart Insights */}
          <SmartInsights
            userMetrics={analyticsData.userMetrics}
            clientMetrics={analyticsData.clientMetrics}
            completionRate={analyticsData.completionRate}
            unassignedCount={analyticsData.unassigned}
            overdueCount={analyticsData.overdue}
            totalTasks={analyticsData.total}
            tasksPerDay={analyticsData.tasksPerDay}
            isCurrentMonth={isCurrentMonth}
          />

          {/* Client Analysis */}
          <ClientAnalysis 
            clientMetrics={analyticsData.clientMetrics}
            isCurrentMonth={isCurrentMonth}
          />
        </>
      )}
    </div>
  );
}
