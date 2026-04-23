import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, Calendar, Building2, History, AlertCircle, CheckCircle, Clock, ListTodo, Lock, Copy, Hash, Smartphone, Palette, CalendarClock, Sparkles, Loader2, RotateCw, Send, MessageSquareWarning, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTypeColor } from "@/components/ui/task-card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TaskAssignedUsers } from "@/components/tasks/TaskAssignedUsers";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useDeletePermission } from "@/hooks/useDeletePermission";
import { LinkifyText } from "@/lib/linkify";
import { AttachmentsDisplay, Attachment } from "@/components/ui/file-attachments";
import { useAIAssist } from "@/hooks/useAIAssist";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { describeRecurrence } from "@/lib/recurrence";
import { useCreateApprovalLink } from "@/hooks/useCreateApprovalLink";

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
  is_recurring?: boolean;
  recurrence_rule?: any;
  recurrence_parent_id?: string | null;
  next_occurrence_generated?: boolean;
  is_rejected?: boolean;
  client_feedback?: string | null;
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
  taskType?: string | null;
  getTypeName?: (slug: string | null) => string;
  getTypeIcon?: (slug: string | null) => string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  todo: { label: "A Fazer", color: "bg-gray-500" },
  in_progress: { label: "Em Andamento", color: "bg-blue-500" },
  em_revisao: { label: "Em Revisão", color: "bg-purple-500" },
  approved: { label: "Aprovado", color: "bg-emerald-500" },
  done: { label: "Concluída", color: "bg-green-500" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-gray-500" },
  medium: { label: "Média", color: "bg-yellow-500" },
  high: { label: "Alta", color: "bg-red-500" },
};

export function TaskDetailsDialog({ task, open, onOpenChange, onEdit, onDelete, onDuplicate, getClientName, getAssignedUsers, onTaskUpdate, taskType, getTypeName, getTypeIcon }: TaskDetailsDialogProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showNoPermissionAlert, setShowNoPermissionAlert] = useState(false);
  const [showAIPreview, setShowAIPreview] = useState(false);
  const [aiSuggestion, setAISuggestion] = useState<any>(null);
  const [aiApplying, setAIApplying] = useState(false);
  const [showAIDirection, setShowAIDirection] = useState(false);
  const [aiDirection, setAiDirection] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [creatorName, setCreatorName] = useState<string>("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [showStopRecurrenceAlert, setShowStopRecurrenceAlert] = useState(false);
  const [stoppingRecurrence, setStoppingRecurrence] = useState(false);
  
  const { canDelete, isCreator, isAdmin, creatorName: permissionCreatorName } = useDeletePermission(task?.created_by);
  const { improveTask, loading: aiLoading } = useAIAssist();
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [localTask, setLocalTask] = useState<Task | null>(task);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchCandidates, setBatchCandidates] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [showMoveToReviewDialog, setShowMoveToReviewDialog] = useState(false);
  const [movingToReview, setMovingToReview] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const { findBatchCandidates, createLink, isCreating } = useCreateApprovalLink();

  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [task?.id]);


  const APPROVAL_MAX_BYTES = 100 * 1024 * 1024;

  const validateAttachmentsForApproval = (atts?: Attachment[]) => {
    if (!atts || atts.length === 0) return false;
    for (const a of atts) {
      const size = (a as any).size ?? (a as any).file_size ?? 0;
      if (size && size > APPROVAL_MAX_BYTES) {
        toast({
          title: "Arquivo acima do limite",
          description: "O arquivo excede o limite de 10MB para links de aprovação.",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const proceedWithApproval = async () => {
    if (!localTask) return;
    const hasAttachments = (localTask.attachments?.length ?? 0) > 0;
    if (!hasAttachments) {
      toast({ title: "Adicione um anexo antes de enviar para aprovação.", variant: "destructive" });
      return;
    }
    if (!validateAttachmentsForApproval(localTask.attachments)) return;
    const candidates = await findBatchCandidates(localTask.id, localTask.client_id);
    if (candidates.length > 0) {
      setBatchCandidates(candidates);
      setSelectedBatchIds(candidates.map((c) => c.id));
      setShowBatchDialog(true);
      return;
    }
    await createLink([localTask.id]);
    onTaskUpdate?.();
  };

  const handleSendForApproval = async () => {
    if (!localTask) return;
    if (localTask.status !== "em_revisao") {
      setShowMoveToReviewDialog(true);
      return;
    }
    await proceedWithApproval();
  };

  const handleMoveToReviewAndContinue = async () => {
    if (!localTask) return;
    setMovingToReview(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "em_revisao" })
        .eq("id", localTask.id);
      if (error) {
        toast({ title: "Erro ao mover tarefa", description: error.message, variant: "destructive" });
        return;
      }
      setLocalTask({ ...localTask, status: "em_revisao" } as Task);
      onTaskUpdate?.();
      setShowMoveToReviewDialog(false);
      // Use updated reference for downstream logic
      const updated = { ...localTask, status: "em_revisao" } as Task;
      const hasAttachments = (updated.attachments?.length ?? 0) > 0;
      if (!hasAttachments) {
        toast({ title: "Adicione um anexo antes de enviar para aprovação.", variant: "destructive" });
        return;
      }
      if (!validateAttachmentsForApproval(updated.attachments)) return;
      const candidates = await findBatchCandidates(updated.id, updated.client_id);
      if (candidates.length > 0) {
        setBatchCandidates(candidates);
        setSelectedBatchIds(candidates.map((c) => c.id));
        setShowBatchDialog(true);
        return;
      }
      await createLink([updated.id]);
      onTaskUpdate?.();
    } finally {
      setMovingToReview(false);
    }
  };

  const handleConfirmBatch = async (includeBatch: boolean) => {
    if (!localTask) return;
    const ids = includeBatch
      ? [localTask.id, ...selectedBatchIds]
      : [localTask.id];
    setShowBatchDialog(false);
    await createLink(ids);
    onTaskUpdate?.();
  };

  const toggleBatchId = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  useEffect(() => {
    const loadTaskDetails = async () => {
      if (localTask?.history) {
        setHistory(Array.isArray(localTask.history) ? localTask.history : []);
      } else {
        setHistory([]);
      }

      if (localTask?.subtasks) {
        setSubtasks(Array.isArray(localTask.subtasks) ? localTask.subtasks : []);
      } else {
        setSubtasks([]);
      }

      // Buscar nome do criador
      if (localTask?.created_by) {
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", localTask.created_by)
          .single();
        
        if (creatorProfile) {
          setCreatorName(creatorProfile.name);
        }
      }
    };

    loadTaskDetails();
  }, [localTask]);

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
      toast({
        title: "Erro ao atualizar subtarefa",
        description: "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (!task || !localTask) return null;

  const handleDelete = () => {
    onDelete(task.id);
    setShowDeleteAlert(false);
    onOpenChange(false);
  };

  const handleEdit = () => {
    onEdit(localTask);
    onOpenChange(false);
  };

  const assignedUsers = getAssignedUsers(localTask.id);

  const getUrgencyBadge = () => {
    if (localTask.status === 'done') {
      return (
        <Badge className="bg-green-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Concluída
        </Badge>
      );
    }

    if (localTask.due_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDate = new Date(localTask.due_date);
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

    if (localTask.priority === 'high') {
      return (
        <Badge className="bg-orange-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Urgente
        </Badge>
      );
    }

    return null;
  };

  const handleStopRecurrence = async () => {
    if (!localTask) return;
    setStoppingRecurrence(true);
    try {
      const parentScope = localTask.recurrence_parent_id ?? localTask.id;
      const { error } = await supabase
        .from("tasks")
        .update({ is_recurring: false, next_occurrence_generated: true })
        .or(`id.eq.${localTask.id},recurrence_parent_id.eq.${parentScope}`)
        .neq("status", "done");
      if (error) throw error;
      toast({
        title: "Recorrência interrompida",
        description: "Esta tarefa não gerará mais ocorrências.",
      });
      setLocalTask({ ...localTask, is_recurring: false, next_occurrence_generated: true });
      onTaskUpdate?.();
    } catch (err: any) {
      toast({
        title: "Erro ao interromper recorrência",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setStoppingRecurrence(false);
      setShowStopRecurrenceAlert(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl lg:max-w-4xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 md:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl">{localTask.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {localTask.is_rejected && localTask.client_feedback && (
              <Alert variant="destructive">
                <MessageSquareWarning className="h-4 w-4" />
                <AlertTitle>Ajuste Solicitado pelo Cliente</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">
                  {localTask.client_feedback}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-wrap gap-2">
              {taskType && getTypeName && (
                <Badge className={`${getTypeColor(taskType)} border-0 text-sm`}>
                  {getTypeIcon?.(taskType)} {getTypeName(taskType)}
                </Badge>
              )}
              <Badge className={statusConfig[localTask.status]?.color || "bg-gray-500"}>
                {statusConfig[localTask.status]?.label || localTask.status}
              </Badge>
              <Badge className={priorityConfig[localTask.priority]?.color || "bg-gray-500"}>
                {priorityConfig[localTask.priority]?.label || localTask.priority}
              </Badge>
              {getUrgencyBadge()}
            </div>

            {localTask.is_recurring && (
              <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <RotateCw className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="font-medium">Tarefa recorrente</span>
                  {localTask.recurrence_rule && (
                    <span className="text-muted-foreground truncate">
                      · {describeRecurrence(localTask.recurrence_rule)}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStopRecurrenceAlert(true)}
                  disabled={stoppingRecurrence}
                  className="flex-shrink-0"
                >
                  Parar Recorrência
                </Button>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              {localTask.due_date && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Data de Vencimento</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(localTask.due_date), "PPP", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )}

              {localTask.client_id && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Cliente</p>
                    <p className="text-sm text-muted-foreground">{getClientName(localTask.client_id)}</p>
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

              {localTask.description && (() => {
                const isLongDescription =
                  localTask.description.length > 240 ||
                  localTask.description.split('\n').length > 6;
                return (
                  <div>
                    <p className="text-sm font-medium mb-1">Descrição</p>
                    <div
                      className={cn(
                        "relative transition-all",
                        isLongDescription && !isDescriptionExpanded && "max-h-[180px] overflow-hidden",
                      )}
                    >
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        <LinkifyText text={localTask.description} />
                      </p>
                      {isLongDescription && !isDescriptionExpanded && (
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
                      )}
                    </div>
                    {isLongDescription && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDescriptionExpanded((v) => !v)}
                        className="mt-2 h-8 px-2 text-primary hover:text-primary"
                      >
                        {isDescriptionExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            Ver menos
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Ver mais
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                );
              })()}

              {/* Anexos */}
              {localTask.attachments && localTask.attachments.length > 0 && (
                <AttachmentsDisplay attachments={localTask.attachments} />
              )}

              {/* Campos de Redes Sociais */}
              {(localTask.platform || localTask.post_type || localTask.post_date || localTask.hashtags?.length) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      {taskType === 'criativos' ? (
                        <><Palette className="h-4 w-4 text-muted-foreground" /> Criativos</>
                      ) : (
                        <><Smartphone className="h-4 w-4 text-muted-foreground" /> Redes Sociais</>
                      )}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {localTask.platform && (
                        <div>
                          <p className="text-xs text-muted-foreground">Plataforma</p>
                          <p className="text-sm font-medium capitalize">{localTask.platform}</p>
                        </div>
                      )}
                      {localTask.post_type && (
                        <div>
                          <p className="text-xs text-muted-foreground">Tipo de Conteúdo</p>
                          <p className="text-sm font-medium capitalize">{localTask.post_type}</p>
                        </div>
                      )}
                    </div>
                    {localTask.post_date && (
                      <div className="flex items-start gap-2">
                        <CalendarClock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Data de Publicação</p>
                          <p className="text-sm font-medium">
                            {format(new Date(localTask.post_date), "PPP", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    )}
                    {localTask.hashtags && localTask.hashtags.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Hashtags</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {localTask.hashtags.map((tag, i) => (
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
              {localTask.creative_instructions && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <Palette className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Instruções Criativas</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                        <LinkifyText text={localTask.creative_instructions} />
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
                            <span>{format(new Date(localTask.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                            <span>•</span>
                            <span>por {creatorName}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Histórico de mudanças */}
                    {history.map((entry: any, index: number) => {
                      const isExternal = entry.type === 'external_approval';
                      const label = isExternal
                        ? entry.decision === 'approved'
                          ? '✅ Aprovado pelo cliente'
                          : '❌ Rejeitado pelo cliente'
                        : entry.action
                        ? entry.action
                        : entry.status
                        ? `Status: ${entry.status}`
                        : 'Atualização registrada';
                      const when = entry.timestamp || entry.at;
                      const who = entry.user_name || entry.user || (isExternal ? 'Cliente' : null);
                      return (
                        <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                          <div className="flex-1">
                            <p className="text-sm">{label}</p>
                            {isExternal && entry.decision === 'rejected' && entry.feedback && (
                              <p className="text-xs text-muted-foreground italic mt-1">"{entry.feedback}"</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {when && <span>{format(new Date(when), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>}
                              {who && (
                                <>
                                  <span>•</span>
                                  <span>por {who}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* AI direction input */}
          {showAIDirection && (
            <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <Label className="text-xs flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Direcionamento (opcional)
              </Label>
              <Textarea
                value={aiDirection}
                onChange={(e) => setAiDirection(e.target.value)}
                placeholder="Descreva como deseja melhorar esta tarefa ou deixe em branco..."
                rows={2}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={async () => {
                  if (!localTask) return;
                  const taskData = {
                    title: localTask.title,
                    description: localTask.description,
                    priority: localTask.priority,
                    platform: localTask.platform,
                    post_type: localTask.post_type,
                    hashtags: localTask.hashtags,
                    creative_instructions: localTask.creative_instructions,
                  };
                  const result = await improveTask(taskData, currentAgency?.id, aiDirection || undefined);
                  if (result) {
                    setAISuggestion(result);
                    setShowAIPreview(true);
                    setShowAIDirection(false);
                    setAiDirection("");
                  }
                }}
                disabled={aiLoading}
                className="w-full"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Melhorar com IA
              </Button>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row sm:flex-wrap sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAIDirection(!showAIDirection);
                if (showAIDirection) setAiDirection("");
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
                  onDuplicate(localTask);
                  onOpenChange(false);
                }}
                className="w-full sm:w-auto"
              >
                <Copy className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Duplicar</span>
              </Button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="w-full sm:w-auto">
                    <Button
                      onClick={handleSendForApproval}
                      disabled={isCreating || (localTask.attachments?.length ?? 0) === 0}
                      className="w-full sm:w-auto bg-amber-500 hover:bg-amber-500/90 text-white"
                    >
                      {isCreating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      <span className="hidden sm:inline">Enviar para Aprovação</span>
                      <span className="sm:hidden">Aprovação</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  A tarefa precisa estar em <strong>Em Revisão</strong> e ter pelo menos um anexo.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

      {/* Dialog de confirmação para parar recorrência */}
      <AlertDialog open={showStopRecurrenceAlert} onOpenChange={setShowStopRecurrenceAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCw className="h-5 w-5" />
              Parar recorrência?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta tarefa e qualquer ocorrência futura pendente deixarão de ser recriadas automaticamente.
              <br /><br />
              Você pode reativar editando a tarefa novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stoppingRecurrence}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStopRecurrence} disabled={stoppingRecurrence}>
              {stoppingRecurrence ? "Parando..." : "Parar recorrência"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {isCreator 
                ? `Tem certeza que deseja excluir sua tarefa "${localTask.title}"?`
                : `Você está excluindo uma tarefa criada por ${permissionCreatorName || creatorName}. Tem certeza que deseja excluir "${localTask.title}"?`
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
                    {aiSuggestion.title && aiSuggestion.title !== localTask?.title && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Título</p>
                        <p className="text-xs text-muted-foreground line-through">{localTask?.title}</p>
                        <p className="text-sm text-foreground">{aiSuggestion.title}</p>
                      </div>
                    )}
                    {aiSuggestion.description && aiSuggestion.description !== localTask?.description && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Descrição</p>
                        {localTask?.description && <p className="text-xs text-muted-foreground line-through whitespace-pre-wrap">{localTask.description}</p>}
                        <p className="text-sm text-foreground whitespace-pre-wrap">{aiSuggestion.description}</p>
                      </div>
                    )}
                    {aiSuggestion.creative_instructions && aiSuggestion.creative_instructions !== localTask?.creative_instructions && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Instruções Criativas</p>
                        {localTask?.creative_instructions && <p className="text-xs text-muted-foreground line-through whitespace-pre-wrap">{localTask.creative_instructions}</p>}
                        <p className="text-sm text-foreground whitespace-pre-wrap">{aiSuggestion.creative_instructions}</p>
                      </div>
                    )}
                    {aiSuggestion.hashtags?.length > 0 && JSON.stringify(aiSuggestion.hashtags) !== JSON.stringify(localTask?.hashtags) && (
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
                if (!localTask || !aiSuggestion) return;
                setAIApplying(true);
                try {
                  const updates: Record<string, any> = {};
                  if (aiSuggestion.title) updates.title = aiSuggestion.title;
                  if (aiSuggestion.description) updates.description = aiSuggestion.description;
                  if (aiSuggestion.creative_instructions) updates.creative_instructions = aiSuggestion.creative_instructions;
                  if (aiSuggestion.hashtags?.length) updates.hashtags = aiSuggestion.hashtags;
                  if (aiSuggestion.platform) updates.platform = aiSuggestion.platform;
                  if (aiSuggestion.post_type) updates.post_type = aiSuggestion.post_type;

                  // Add history entry
                  const newHistoryEntry = {
                    action: "Tarefa melhorada com IA",
                    timestamp: new Date().toISOString(),
                    user_name: profile?.name || "Usuário",
                  };
                  const updatedHistory = [...history, newHistoryEntry];
                  updates.history = updatedHistory;

                  const { error } = await supabase
                    .from("tasks")
                    .update(updates)
                    .eq("id", localTask.id);

                  if (error) throw error;

                  // Update local state immediately
                  setLocalTask(prev => prev ? { ...prev, ...updates } : prev);
                  setHistory(updatedHistory);

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

      {/* Mover para Em Revisão antes de gerar link de aprovação */}
      <AlertDialog open={showMoveToReviewDialog} onOpenChange={setShowMoveToReviewDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para Em Revisão?</AlertDialogTitle>
            <AlertDialogDescription>
              Para enviar uma tarefa para aprovação do cliente, ela precisa estar na coluna <strong>Em Revisão</strong>. Deseja mover esta tarefa agora e continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={movingToReview}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveToReviewAndContinue} disabled={movingToReview}>
              {movingToReview ? "Movendo..." : "Mover e Continuar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Smart Batch — confirmação para agrupar tarefas em revisão */}
      <AlertDialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Agrupar tarefas em um único link?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Detectamos {batchCandidates.length} outra{batchCandidates.length > 1 ? "s" : ""} tarefa
              {batchCandidates.length > 1 ? "s" : ""} deste cliente também aguardando revisão.
              Selecione abaixo as que deseja incluir no mesmo link de aprovação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-2 my-2">
            {batchCandidates.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted"
              >
                <Checkbox
                  checked={selectedBatchIds.includes(c.id)}
                  onCheckedChange={() => toggleBatchId(c.id)}
                />
                <span className="text-sm">{c.title}</span>
              </label>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreating}>Cancelar</AlertDialogCancel>
            <Button
              variant="outline"
              disabled={isCreating}
              onClick={() => handleConfirmBatch(false)}
            >
              Apenas esta tarefa
            </Button>
            <AlertDialogAction
              disabled={isCreating || selectedBatchIds.length === 0}
              onClick={(e) => {
                e.preventDefault();
                handleConfirmBatch(true);
              }}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Gerar link com {selectedBatchIds.length + 1} tarefa
              {selectedBatchIds.length + 1 > 1 ? "s" : ""}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
