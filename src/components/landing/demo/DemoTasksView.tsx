import { CheckSquare, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { demoTasks, getPriorityColor } from "@/data/demoData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function DemoTasksView() {
  const pendingTasks = demoTasks.filter(t => t.status === "pendente");
  const inProgressTasks = demoTasks.filter(t => t.status === "em_progresso");
  const completedTasks = demoTasks.filter(t => t.status === "concluida");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "concluida":
        return <CheckSquare className="h-4 w-4 text-green-600" />;
      case "em_progresso":
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    }
  };

  const TaskColumn = ({ title, tasks, color }: { title: string; tasks: typeof demoTasks; color: string }) => (
    <Card className="flex-1">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${color}`} />
            {title}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {tasks.map((task) => (
          <TooltipProvider key={task.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 bg-muted/50 rounded-lg cursor-not-allowed hover:bg-muted transition-colors">
                  <div className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded border border-muted-foreground/30 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{task.client_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(task.due_date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Solicite acesso para gerenciar tarefas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 space-y-4 overflow-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tarefas</h2>
          <p className="text-sm text-muted-foreground">{demoTasks.length} tarefas no total</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="bg-[#1c102f] hover:bg-[#1c102f]/90 cursor-not-allowed opacity-70" size="sm">
                + Nova Tarefa
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Solicite acesso para adicionar tarefas</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Task Columns */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <TaskColumn title="Pendentes" tasks={pendingTasks} color="bg-amber-500" />
        <TaskColumn title="Em Progresso" tasks={inProgressTasks} color="bg-blue-500" />
        <TaskColumn title="Concluídas" tasks={completedTasks} color="bg-green-500" />
      </div>
    </div>
  );
}
