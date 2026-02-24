import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, Calendar, Building2, History, AlertCircle, CheckCircle, Clock, ListTodo, Lock, Copy, Hash, Smartphone, Palette, CalendarClock, Sparkles, Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { TaskAssignedUsers } from "@/components/tasks/TaskAssignedUsers";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeletePermission } from "@/hooks/useDeletePermission";
import { LinkifyText } from "@/lib/linkify";
import { AttachmentsDisplay, Attachment } from "@/components/ui/file-attachments";
import { useAIAssist } from "@/hooks/useAIAssist";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";

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
  attachments?: Attachment[];
  platform?: string | null;
  post_type?: string | null;
  post_date?: string | null;
  hashtags?: string[] | null;
  creative_instructions?: string | null;
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
  const [showAIPreview, setShowAIPreview] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState<any>(null);
  const [aiApplying, setAIApplying] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [creatorName, setCreatorName] = useState<string>("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  
  const { canDelete, isCreator, isAdmin, creatorName: permissionCreatorName } = useDeletePermission(task?.created_by);
  const { improveTask, loading: aiLoading } = useAIAssist();
  const { currentAgency } = useAgency();
  const { toast } = useToast();

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
        <DialogContent className="max-w-2xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl">{task.title}</DialogTitle>
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
                    <LinkifyText text={task.description} />
                  </p>
                </div>
              )}

              {/* Anexos */}
              {task.attachments && task.attachments.length > 0 && (
                <AttachmentsDisplay attachments={task.attachments} />
              )}

              {/* Campos de Redes Sociais */}
              {(task.platform || task.post_type || task.post_date || task.hashtags?.length) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      Redes Sociais
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {task.platform && (
                        <div>
                          <p className="text-xs text-muted-foreground">Plataforma</p>
                          <p className="text-sm font-medium capitalize">{task.platform}</p>
                        </div>
                      )}
                      {task.post_type && (
                        <div>
                          <p className="text-xs text-muted-foreground">Tipo de Conteúdo</p>
                          <p className="text-sm font-medium capitalize">{task.post_type}</p>
                        </div>
                      )}
                    </div>
                    {task.post_date && (
                      <div className="flex items-start gap-2">
                        <CalendarClock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Data de Publicação</p>
                          <p className="text-sm font-medium">
                            {format(new Date(task.post_date), "PPP", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )}
                    {task.hashtags && task.hashtags.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Hashtags</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {task.hashtags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {tag.startsWith("#") ? tag : `#${tag}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Instruções Criativas - para Redes Sociais e Criativos */}
              {task.creative_instructions && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <Palette className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Instruções Criativas</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                        <LinkifyText text={task.creative_instructions} />
                      </p>
                    </div>
                  </div>
                </>
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

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (!task) return;
                const taskData = {
                  title: task.title,
                  description: task.description,
                  priority: task.priority,
                  platform: task.platform,
                  post_type: task.post_type,
                  hashtags: task.hashtags,
                  creative_instructions: task.creative_instructions,
                };
                const result = await improveTask(taskData, currentAgency?.id);
                if (result) {
                  setAISuggestion(result);
                  setShowAIPreview(true);
                }
              }}
              disabled={aiLoading}
              className="w-full sm:w-auto"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              <span className="hidden sm:inline">Melhorar com IA</span>
              <span className="sm:hidden">IA</span>
            </Button>
            {onDuplicate && (
              <Button
                variant="outline"
                onClick={() => {
                  onDuplicate(task);
                  onOpenChange(false);
                }}
                className="w-full sm:w-auto"
              >
                <Copy className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Duplicar</span>
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => canDelete ? setShowDeleteAlert(true) : setShowNoPermissionAlert(true)}
              className="w-full sm:w-auto"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
            <Button onClick={handleEdit} className="w-full sm:w-auto">
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

      {/* Dialog de preview da IA */}
      <AlertDialog open={showAIPreview} onOpenChange={setShowAIPreview}>
        <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Sugestões da IA
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 mt-2">
                {aiSuggestion && (
                  <>
                    {aiSuggestion.title && aiSuggestion.title !== task?.title && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Título</p>
                        <p className="text-xs text-muted-foreground line-through">{task?.title}</p>
                        <p className="text-sm text-foreground">{aiSuggestion.title}</p>
                      </div>
                    )}
                    {aiSuggestion.description && aiSuggestion.description !== task?.description && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Descrição</p>
                        {task?.description && <p className="text-xs text-muted-foreground line-through whitespace-pre-wrap">{task.description}</p>}
                        <p className="text-sm text-foreground whitespace-pre-wrap">{aiSuggestion.description}</p>
                      </div>
                    )}
                    {aiSuggestion.creative_instructions && aiSuggestion.creative_instructions !== task?.creative_instructions && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Instruções Criativas</p>
                        {task?.creative_instructions && <p className="text-xs text-muted-foreground line-through whitespace-pre-wrap">{task.creative_instructions}</p>}
                        <p className="text-sm text-foreground whitespace-pre-wrap">{aiSuggestion.creative_instructions}</p>
                      </div>
                    )}
                    {aiSuggestion.hashtags?.length > 0 && JSON.stringify(aiSuggestion.hashtags) !== JSON.stringify(task?.hashtags) && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Hashtags</p>
                        <div className="flex flex-wrap gap-1">
                          {aiSuggestion.hashtags.map((tag: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag.startsWith("#") ? tag : `#${tag}`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={aiApplying}
              onClick={async (e) => {
                e.preventDefault();
                if (!task || !aiSuggestion) return;
                setAIApplying(true);
                try {
                  const updates: Record<string, any> = {};
                  if (aiSuggestion.title) updates.title = aiSuggestion.title;
                  if (aiSuggestion.description) updates.description = aiSuggestion.description;
                  if (aiSuggestion.creative_instructions) updates.creative_instructions = aiSuggestion.creative_instructions;
                  if (aiSuggestion.hashtags?.length) updates.hashtags = aiSuggestion.hashtags;
                  if (aiSuggestion.platform) updates.platform = aiSuggestion.platform;
                  if (aiSuggestion.post_type) updates.post_type = aiSuggestion.post_type;

                  const { error } = await supabase
                    .from("tasks")
                    .update(updates)
                    .eq("id", task.id);

                  if (error) throw error;

                  toast({ title: "Tarefa melhorada com sucesso!" });
                  setShowAIPreview(false);
                  setAISuggestion(null);
                  onTaskUpdate?.();
                } catch (error) {
                  console.error("Error applying AI suggestion:", error);
                  toast({ title: "Erro ao aplicar sugestões", variant: "destructive" });
                } finally {
                  setAIApplying(false);
                }
              }}
            >
              {aiApplying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Aplicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
