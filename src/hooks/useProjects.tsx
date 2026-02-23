import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, isPast, parseISO } from "date-fns";

// ---- Types ----
export interface Project {
  id: string;
  agency_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  project_type: string;
  start_date: string | null;
  end_date: string | null;
  is_recurring: boolean;
  recurrence_interval: string | null;
  created_by: string | null;
  responsible_id: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  // joined
  clients?: { name: string } | null;
  responsible?: { name: string } | null;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  agency_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  subtasks: any[];
  sort_order: number;
  created_at: string;
  updated_at: string;
  assigned_user?: { name: string } | null;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  agency_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProjectPayment {
  id: string;
  project_id: string;
  agency_id: string;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: string;
  description: string | null;
  created_at: string;
}

export interface ProjectNote {
  id: string;
  project_id: string;
  agency_id: string;
  content: string;
  created_by: string | null;
  created_at: string;
  author?: { name: string } | null;
}

export type ProjectStatus = "planejamento" | "em_andamento" | "em_risco" | "atrasado" | "concluido";

// ---- Status & Health Calculation ----
export function calculateProjectStatus(
  tasks: ProjectTask[],
  endDate: string | null
): ProjectStatus {
  if (tasks.length === 0) return "planejamento";

  const doneTasks = tasks.filter((t) => t.status === "done");
  if (doneTasks.length === tasks.length) return "concluido";

  const today = new Date();

  if (endDate && isPast(parseISO(endDate)) && doneTasks.length < tasks.length) {
    return "atrasado";
  }

  const overdueTasks = tasks.filter(
    (t) => t.due_date && isPast(parseISO(t.due_date)) && t.status !== "done"
  );
  if (overdueTasks.length > 0) return "em_risco";

  if (endDate) {
    const start = tasks.reduce((min, t) => {
      const d = t.created_at;
      return d < min ? d : min;
    }, tasks[0].created_at);
    const totalDays = differenceInDays(parseISO(endDate), parseISO(start));
    const elapsedDays = differenceInDays(today, parseISO(start));
    const progressPct = doneTasks.length / tasks.length;
    const timePct = totalDays > 0 ? elapsedDays / totalDays : 0;

    if (progressPct < 0.3 && timePct > 0.5) return "em_risco";
  }

  return "em_andamento";
}

export function calculateHealthScore(
  tasks: ProjectTask[],
  payments: ProjectPayment[],
  startDate: string | null,
  endDate: string | null
): number {
  const today = new Date();
  let score = 0;

  // 1. Prazo (25 pts)
  if (!endDate) {
    score += 25;
  } else {
    const end = parseISO(endDate);
    if (isPast(end)) {
      score += 0;
    } else {
      const start = startDate ? parseISO(startDate) : today;
      const total = differenceInDays(end, start);
      const remaining = differenceInDays(end, today);
      score += total > 0 ? Math.round(25 * Math.min(1, remaining / total)) : 25;
    }
  }

  // 2. Progresso (25 pts)
  if (tasks.length === 0) {
    score += 25;
  } else {
    const donePct = tasks.filter((t) => t.status === "done").length / tasks.length;
    let timePct = 0.5;
    if (startDate && endDate) {
      const total = differenceInDays(parseISO(endDate), parseISO(startDate));
      const elapsed = differenceInDays(today, parseISO(startDate));
      timePct = total > 0 ? Math.max(0.01, elapsed / total) : 0.5;
    }
    score += Math.round(25 * Math.min(1, donePct / timePct));
  }

  // 3. Pendencias (25 pts)
  const overdue = tasks.filter(
    (t) => t.due_date && isPast(parseISO(t.due_date)) && t.status !== "done"
  ).length;
  score += Math.max(0, 25 - overdue * 5);

  // 4. Financeiro (25 pts)
  if (payments.length === 0) {
    score += 25;
  } else {
    const totalAmount = payments.reduce((s, p) => s + Number(p.amount), 0);
    const paidAmount = payments
      .filter((p) => p.paid_at)
      .reduce((s, p) => s + Number(p.amount), 0);
    const paidPct = totalAmount > 0 ? paidAmount / totalAmount : 0;
    let timePct = 0.5;
    if (startDate && endDate) {
      const total = differenceInDays(parseISO(endDate), parseISO(startDate));
      const elapsed = differenceInDays(today, parseISO(startDate));
      timePct = total > 0 ? Math.max(0.01, elapsed / total) : 0.5;
    }
    score += Math.round(25 * Math.min(1, paidPct / timePct));
  }

  return Math.min(100, Math.max(0, score));
}

export function getHealthColor(score: number) {
  if (score >= 80) return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
}

export function getStatusLabel(status: ProjectStatus) {
  const map: Record<ProjectStatus, string> = {
    planejamento: "Planejamento",
    em_andamento: "Em Andamento",
    em_risco: "Em Risco",
    atrasado: "Atrasado",
    concluido: "Concluído",
  };
  return map[status];
}

export function getStatusColor(status: ProjectStatus) {
  const map: Record<ProjectStatus, string> = {
    planejamento: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    em_andamento: "bg-primary/10 text-primary",
    em_risco: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    atrasado: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    concluido: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };
  return map[status];
}

// ---- Hook ----
export function useProjects() {
  const { currentAgency } = useAgency();
  const agencyId = currentAgency?.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  // Projects list
  const projectsQuery = useQuery({
    queryKey: ["projects", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects" as any)
        .select("*, clients(name)")
        .eq("agency_id", agencyId!)
        .eq("archived", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Project[];
    },
    enabled: !!agencyId,
  });

  // Single project
  const useProject = (id: string | undefined) =>
    useQuery({
      queryKey: ["project", id],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("projects" as any)
          .select("*, clients(name)")
          .eq("id", id!)
          .single();
        if (error) throw error;
        return data as unknown as Project;
      },
      enabled: !!id,
    });

  // Tasks for a project
  const useProjectTasks = (projectId: string | undefined) =>
    useQuery({
      queryKey: ["project-tasks", projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("project_tasks" as any)
          .select("*")
          .eq("project_id", projectId!)
          .order("sort_order", { ascending: true });
        if (error) throw error;
        return (data || []) as unknown as ProjectTask[];
      },
      enabled: !!projectId,
    });

  // Milestones
  const useProjectMilestones = (projectId: string | undefined) =>
    useQuery({
      queryKey: ["project-milestones", projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("project_milestones" as any)
          .select("*")
          .eq("project_id", projectId!)
          .order("sort_order", { ascending: true });
        if (error) throw error;
        return (data || []) as unknown as ProjectMilestone[];
      },
      enabled: !!projectId,
    });

  // Payments
  const useProjectPayments = (projectId: string | undefined) =>
    useQuery({
      queryKey: ["project-payments", projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("project_payments" as any)
          .select("*")
          .eq("project_id", projectId!)
          .order("due_date", { ascending: true });
        if (error) throw error;
        return (data || []) as unknown as ProjectPayment[];
      },
      enabled: !!projectId,
    });

  // Notes
  const useProjectNotes = (projectId: string | undefined) =>
    useQuery({
      queryKey: ["project-notes", projectId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("project_notes" as any)
          .select("*")
          .eq("project_id", projectId!)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []) as unknown as ProjectNote[];
      },
      enabled: !!projectId,
    });

  // All tasks for all projects (for dashboard metrics)
  const allTasksQuery = useQuery({
    queryKey: ["all-project-tasks", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks" as any)
        .select("*")
        .eq("agency_id", agencyId!);
      if (error) throw error;
      return (data || []) as unknown as ProjectTask[];
    },
    enabled: !!agencyId,
  });

  // All payments for metrics
  const allPaymentsQuery = useQuery({
    queryKey: ["all-project-payments", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_payments" as any)
        .select("*")
        .eq("agency_id", agencyId!);
      if (error) throw error;
      return (data || []) as unknown as ProjectPayment[];
    },
    enabled: !!agencyId,
  });

  // ---- Mutations ----
  const createProject = useMutation({
    mutationFn: async (project: Partial<Project>) => {
      const { data, error } = await supabase
        .from("projects" as any)
        .insert({ ...project, agency_id: agencyId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projeto criado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao criar projeto", variant: "destructive" }),
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { error } = await supabase
        .from("projects" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project"] });
      toast({ title: "Projeto atualizado!" });
    },
    onError: () => toast({ title: "Erro ao atualizar projeto", variant: "destructive" }),
  });

  const archiveProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("projects" as any)
        .update({ archived: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projeto arquivado!" });
    },
  });

  // Task mutations
  const createTask = useMutation({
    mutationFn: async (task: Partial<ProjectTask>) => {
      const { data, error } = await supabase
        .from("project_tasks" as any)
        .insert({ ...task, agency_id: agencyId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-tasks"] });
      qc.invalidateQueries({ queryKey: ["all-project-tasks"] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectTask> & { id: string }) => {
      const payload: any = { ...updates };
      if (updates.status === "done" && !updates.completed_at) {
        payload.completed_at = new Date().toISOString();
      }
      if (updates.status && updates.status !== "done") {
        payload.completed_at = null;
      }
      const { error } = await supabase
        .from("project_tasks" as any)
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-tasks"] });
      qc.invalidateQueries({ queryKey: ["all-project-tasks"] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_tasks" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-tasks"] });
      qc.invalidateQueries({ queryKey: ["all-project-tasks"] });
    },
  });

  // Milestone mutations
  const createMilestone = useMutation({
    mutationFn: async (milestone: Partial<ProjectMilestone>) => {
      const { data, error } = await supabase
        .from("project_milestones" as any)
        .insert({ ...milestone, agency_id: agencyId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-milestones"] }),
  });

  const updateMilestone = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectMilestone> & { id: string }) => {
      const { error } = await supabase
        .from("project_milestones" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-milestones"] }),
  });

  const deleteMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_milestones" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-milestones"] }),
  });

  // Payment mutations
  const createPayment = useMutation({
    mutationFn: async (payment: Partial<ProjectPayment>) => {
      const { data, error } = await supabase
        .from("project_payments" as any)
        .insert({ ...payment, agency_id: agencyId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-payments"] });
      qc.invalidateQueries({ queryKey: ["all-project-payments"] });
    },
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ProjectPayment> & { id: string }) => {
      const { error } = await supabase
        .from("project_payments" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-payments"] });
      qc.invalidateQueries({ queryKey: ["all-project-payments"] });
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_payments" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project-payments"] });
      qc.invalidateQueries({ queryKey: ["all-project-payments"] });
    },
  });

  // Note mutations
  const createNote = useMutation({
    mutationFn: async (note: Partial<ProjectNote>) => {
      const { data, error } = await supabase
        .from("project_notes" as any)
        .insert({ ...note, agency_id: agencyId } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-notes"] }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_notes" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project-notes"] }),
  });

  return {
    projects: projectsQuery.data || [],
    isLoading: projectsQuery.isLoading,
    allTasks: allTasksQuery.data || [],
    allPayments: allPaymentsQuery.data || [],
    useProject,
    useProjectTasks,
    useProjectMilestones,
    useProjectPayments,
    useProjectNotes,
    createProject,
    updateProject,
    archiveProject,
    createTask,
    updateTask,
    deleteTask,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    createPayment,
    updatePayment,
    deletePayment,
    createNote,
    deleteNote,
  };
}
