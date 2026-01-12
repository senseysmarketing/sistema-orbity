import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, Calendar, Building2, History, AlertCircle, CheckCircle, Clock, ListTodo, Lock, Copy } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { TaskAssignedUsers } from "@/components/tasks/TaskAssignedUsers";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeletePermission } from "@/hooks/useDeletePermission";
interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

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
  history?: any[];
  subtasks?: Subtask[];
}

interface Client {
  id: string;
  name: string;
}

interface TaskDetailsDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDuplicate?: (task: Task) => void;
  getClientName: (clientId: string | null) => string;
  getAssignedUsers: (taskId: string) => any[];
  onTaskUpdate?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "A Fazer", color: "bg-gray-500" },
  in_progress: { label: "Em Andamento", color: "bg-blue-500" },
  em_revisao: { label: "Em Revisão", color: "bg-purple-500" },
  done: { label: "Concluída", color: "bg-green-500" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-gray-500" },
  medium: { label: "Média", color: "bg-yellow-500" },
  high: { label: "Alta", color: "bg-red-500" },
};

export function TaskDetailsDialog({ task, open, onOpenChange, onEdit, onDelete, onDuplicate, getClientName, getAssignedUsers, onTaskUpdate }: TaskDetailsDialogProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showNoPermissionAlert, setShowNoPermissionAlert] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [creatorName, setCreatorName] = useState<string>("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  
  const { canDelete, isCreator, isAdmin, creatorName: permissionCreatorName } = useDeletePermission(task?.created_by);

  useEffect(() => {
    const loadTaskDetails = async () => {
      if (task?.history) {
        setHistory(Array.isArray(task.history) ? task.history : []);
      } else {
        setHistory([]);
      }

      if (task?.subtasks) {
        setSubtasks(Array.isArray(task.subtasks) ? task.subtasks : []);
      } else {
        setSubtasks([]);
      }

      // Buscar nome do criador
      if (task?.created_by) {
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", task.created_by)
          .single();
        
        if (creatorProfile) {
          setCreatorName(creatorProfile.name);
        }
      }
    };

    loadTaskDetails();
  }, [task]);

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!task) return;

    const updatedSubtasks = subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    setSubtasks(updatedSubtasks);

    try {
      const { error } = await supabase
        .from("tasks")
        .update({ subtasks: updatedSubtasks as any })
        .eq("id", task.id);

      if (error) throw error;
      onTaskUpdate?.();
    } catch (error) {
      console.error("Error updating subtask:", error);
      // Reverter em caso de erro
      setSubtasks(subtasks);
    }
  };

  if (!task) return null;

  const handleDelete = () => {
    onDelete(task.id);
    setShowDeleteAlert(false);
    onOpenChange(false);
  };

  const handleEdit = () => {
    onEdit(task);
    onOpenChange(false);
  };

  const assignedUsers = getAssignedUsers(task.id);

  const getUrgencyBadge = () => {
    if (task.status === 'done') {
      return (
        <Badge className="bg-green-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Concluída
        </Badge>
      );
    }

    if (task.due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Atrasada
          </Badge>
        );
      }

      if (dueDate.getTime() === today.getTime()) {
        return (
          <Badge className="bg-blue-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Vence Hoje
          </Badge>
        );
      }
    }

    if (task.priority === 'high') {
      return (
        <Badge className="bg-orange-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Urgente
        </Badge>
      );
    }

    return null;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{task.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className={statusConfig[task.status]?.color || "bg-gray-500"}>
                {statusConfig[task.status]?.label || task.status}
              </Badge>
              <Badge className={priorityConfig[task.priority]?.color || "bg-gray-500"}>
                {priorityConfig[task.priority]?.label || task.priority}
              </Badge>
              {getUrgencyBadge()}
            </div>

            <Separator />

            <div className="space-y-3">
              {task.due_date && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Data de Vencimento</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(task.due_date), "PPP", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}

              {task.client_id && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Cliente</p>
                    <p className="text-sm text-muted-foreground">{getClientName(task.client_id)}</p>
                  </div>
                </div>
              )}

              {assignedUsers.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Responsáveis</p>
                  <TaskAssignedUsers
                    users={assignedUsers.map(a => a.profiles)}
                    showNames
                  />
                </div>
              )}

              {task.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Descrição</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              )}
            </div>

            {/* Subtarefas */}
            {subtasks.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Subtarefas ({subtasks.filter(st => st.completed).length}/{subtasks.length})
                    </p>
                  </div>
                  <div className="space-y-2">
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                        <Checkbox
                          checked={subtask.completed}
                          onCheckedChange={() => handleToggleSubtask(subtask.id)}
                        />
                        <span className={`text-sm ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Histórico de Movimentações */}
            {(history && history.length > 0) || creatorName ? (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Histórico de Movimentações</p>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {/* Entrada de criação */}
                    {creatorName && (
                      <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                        <div className="flex-1">
                          <p className="text-sm">Tarefa criada</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(task.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                            <span>•</span>
                            <span>por {creatorName}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Histórico de mudanças */}
                    {history.map((entry: any, index: number) => (
                      <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                        <div className="flex-1">
                          <p className="text-sm">{entry.action || `Status: ${entry.status}`}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                            {entry.user_name && (
                              <>
                                <span>•</span>
                                <span>por {entry.user_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter className="gap-2">
            {onDuplicate && (
              <Button
                variant="outline"
                onClick={() => {
                  onDuplicate(task);
                  onOpenChange(false);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => canDelete ? setShowDeleteAlert(true) : setShowNoPermissionAlert(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
            <Button onClick={handleEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {isCreator 
                ? `Tem certeza que deseja excluir sua tarefa "${task.title}"?`
                : `Você está excluindo uma tarefa criada por ${permissionCreatorName || creatorName}. Tem certeza que deseja excluir "${task.title}"?`
              }
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de sem permissão */}
      <AlertDialog open={showNoPermissionAlert} onOpenChange={setShowNoPermissionAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Sem permissão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apenas o criador desta tarefa ou um administrador pode excluí-la.
              <br /><br />
              <span className="text-muted-foreground">
                Criado por: <strong>{permissionCreatorName || creatorName || 'Usuário desconhecido'}</strong>
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
