export interface UserMetrics {
  userId: string;
  name: string;
  avatarUrl: string | null;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksInReview: number;
  tasksTodo: number;
  completionRate: number;
  avgTimeToComplete: number; // em dias
  overdueCount: number;
}

export interface ClientMetrics {
  clientId: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
  needsAttention: boolean;
}

export interface SmartInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'alert';
  category: string;
  icon: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface TaskWithAssignments {
  id: string;
  title: string;
  status: string;
  priority: string;
  client_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  archived?: boolean;
  clients?: { name: string } | null;
  task_assignments?: { user_id: string }[];
}

export interface Profile {
  user_id: string;
  name: string;
  avatar_url?: string | null;
}

export interface AnalyticsData {
  total: number;
  completed: number;
  completionRate: number;
  unassigned: number;
  overdue: number;
  avgPerUser: number;
  previousMonthRate: number;
  userMetrics: UserMetrics[];
  clientMetrics: ClientMetrics[];
}
