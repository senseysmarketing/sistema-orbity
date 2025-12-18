import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus, Clock, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface ClientTasksProps {
  clientId: string;
  clientName: string;
}

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-slate-500",
  in_progress: "bg-blue-500",
  review: "bg-purple-500",
  done: "bg-green-500",
  cancelled: "bg-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "A Fazer",
  in_progress: "Em Progresso",
  review: "Em Revisão",
  done: "Concluída",
  cancelled: "Cancelada",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
};

export function ClientTasks({ clientId, clientName }: ClientTasksProps) {
  const navigate = useNavigate();
  const { currentAgency } = useAgency();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["client-tasks", clientId],
    queryFn: async () => {
      // First get task IDs from junction table
      const { data: taskClients, error: junctionError } = await supabase
        .from("task_clients")
        .select("task_id")
        .eq("client_id", clientId);
      
      if (junctionError) throw junctionError;
      
      if (!taskClients || taskClients.length === 0) {
        // Fallback: also check legacy client_id
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("client_id", clientId)
          .order("due_date", { ascending: true, nullsFirst: false });
        if (error) throw error;
        return data;
      }
      
      const taskIds = taskClients.map((tc) => tc.task_id);
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .in("id", taskIds)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const pendingTasks = tasks?.filter((t) => t.status !== "done" && t.status !== "cancelled") || [];
  const completedTasks = tasks?.filter((t) => t.status === "done") || [];
  const overdueTasks = pendingTasks.filter((t) => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)));

  const getDueDateBadge = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = new Date(dueDate);
    
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive" className="text-xs">Atrasada</Badge>;
    }
    if (isToday(date)) {
      return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Hoje</Badge>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingTasks.length}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckSquare className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedTasks.length}</p>
              <p className="text-sm text-muted-foreground">Concluídas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueTasks.length}</p>
              <p className="text-sm text-muted-foreground">Atrasadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Tarefas do Cliente</CardTitle>
          <Button size="sm" onClick={() => navigate("/dashboard/tasks")}>
            <Plus className="h-4 w-4 mr-2" />
            Ver Todas
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
              ))}
            </div>
          ) : !tasks?.length ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma tarefa vinculada a este cliente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.slice(0, 10).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[task.status] || "bg-gray-400"}`} />
                    <div>
                      <p className="font-medium line-clamp-1">{task.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {STATUS_LABELS[task.status] || task.status}
                        </Badge>
                        {task.priority && (
                          <span className={`px-2 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getDueDateBadge(task.due_date)}
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {pendingTasks.length > 10 && (
                <p className="text-center text-sm text-muted-foreground">
                  + {pendingTasks.length - 10} tarefas
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
