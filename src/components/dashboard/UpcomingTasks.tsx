import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckSquare, Calendar, AlertCircle, ArrowRight 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
  client_name?: string;
}

interface UpcomingTasksProps {
  tasks: Task[];
  onToggleTask?: (taskId: string) => void;
}

export function UpcomingTasks({ tasks, onToggleTask }: UpcomingTasksProps) {
  const navigate = useNavigate();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      urgent: "Urgente",
      high: "Alta",
      medium: "Média",
      low: "Baixa",
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5" />
          Próximas Tarefas
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/tasks")}
          className="text-sm"
        >
          Ver todas
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma tarefa pendente
            </p>
          ) : (
            tasks.slice(0, 6).map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                {onToggleTask && (
                  <Checkbox
                    checked={task.status === "done"}
                    onCheckedChange={() => onToggleTask(task.id)}
                    className="mt-1"
                  />
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium leading-none">{task.title}</p>
                    <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                      {getPriorityLabel(task.priority)}
                    </Badge>
                  </div>
                  {task.client_name && (
                    <p className="text-xs text-muted-foreground">
                      Cliente: {task.client_name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    {isOverdue(task.due_date) ? (
                      <>
                        <AlertCircle className="h-3 w-3 text-red-600" />
                        <span className="text-red-600 font-medium">
                          Atrasada desde {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </>
                    ) : (
                      <>
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {format(new Date(task.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}