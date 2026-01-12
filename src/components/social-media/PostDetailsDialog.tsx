import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, Calendar, User, Hash, Building2, Target, History, ListTodo, Users, Lock, Copy } from "lucide-react";
import { SocialMediaPost, Subtask } from "@/hooks/useSocialMediaPosts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { PostAssignedUsers } from "./PostAssignedUsers";
import { useDeletePermission } from "@/hooks/useDeletePermission";

interface PostDetailsDialogProps {
  post: SocialMediaPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (post: SocialMediaPost) => void;
  onDelete: (postId: string) => void;
  onDuplicate?: (post: SocialMediaPost) => void;
  onPostUpdate?: () => void;
}

const platformConfig: Record<string, { label: string; icon: string }> = {
  instagram: { label: "Instagram", icon: "📷" },
  facebook: { label: "Facebook", icon: "👤" },
  linkedin: { label: "LinkedIn", icon: "💼" },
  twitter: { label: "Twitter", icon: "🐦" },
  youtube: { label: "YouTube", icon: "📺" },
  tiktok: { label: "TikTok", icon: "🎵" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Briefing", color: "bg-gray-500" },
  in_creation: { label: "Em Criação", color: "bg-blue-500" },
  pending_approval: { label: "Aguardando", color: "bg-yellow-500" },
  approved: { label: "Aprovado", color: "bg-green-500" },
  published: { label: "Publicado", color: "bg-purple-500" },
  rejected: { label: "Rejeitado", color: "bg-red-500" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-gray-500" },
  medium: { label: "Média", color: "bg-blue-500" },
  high: { label: "Alta", color: "bg-orange-500" },
  urgent: { label: "Urgente", color: "bg-red-500" },
};

const postTypeConfig: Record<string, string> = {
  feed: "Feed",
  stories: "Stories",
  reels: "Reels",
  carrossel: "Carrossel",
};

export function PostDetailsDialog({ post, open, onOpenChange, onEdit, onDelete, onDuplicate, onPostUpdate }: PostDetailsDialogProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showNoPermissionAlert, setShowNoPermissionAlert] = useState(false);
  const [creatorName, setCreatorName] = useState<string>("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  
  const { canDelete, isCreator, isAdmin, creatorName: permissionCreatorName } = useDeletePermission(post?.created_by);

  useEffect(() => {
    const loadData = async () => {
      if (!post?.id) return;

      // Buscar criador
      if (post?.created_by) {
        const { data: creatorProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", post.created_by)
          .single();
        
        if (creatorProfile) {
          setCreatorName(creatorProfile.name);
        }
      }

      // Buscar usuários atribuídos
      const { data: assignments } = await supabase
        .from('post_assignments')
        .select('user_id')
        .eq('post_id', post.id);

      if (assignments && assignments.length > 0) {
        const userIds = assignments.map(a => a.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, user_id, name, role')
          .in('user_id', userIds);
        
        if (profiles) {
          setAssignedUsers(profiles);
        }
      } else {
        setAssignedUsers([]);
      }
    };

    if (post?.subtasks) {
      setSubtasks(Array.isArray(post.subtasks) ? post.subtasks : []);
    } else {
      setSubtasks([]);
    }

    loadData();
  }, [post]);

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!post) return;

    const updatedSubtasks = subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    setSubtasks(updatedSubtasks);

    try {
      const { error } = await supabase
        .from("social_media_posts")
        .update({ subtasks: updatedSubtasks as any })
        .eq("id", post.id);

      if (error) throw error;
      onPostUpdate?.();
    } catch (error) {
      console.error("Error updating subtask:", error);
      // Reverter em caso de erro
      setSubtasks(subtasks);
    }
  };

  if (!post) return null;

  const handleDelete = () => {
    onDelete(post.id);
    setShowDeleteAlert(false);
    onOpenChange(false);
  };

  const handleEdit = () => {
    onEdit(post);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{platformConfig[post.platform.toLowerCase()]?.icon || "📱"}</span>
              {post.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge className={statusConfig[post.status]?.color || "bg-gray-500"}>
                {statusConfig[post.status]?.label || post.status}
              </Badge>
              <Badge className={priorityConfig[post.priority]?.color || "bg-gray-500"}>
                {priorityConfig[post.priority]?.label || post.priority}
              </Badge>
              <Badge variant="outline">
                {postTypeConfig[post.post_type] || post.post_type}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <span>{platformConfig[post.platform.toLowerCase()]?.icon || "📱"}</span>
                {platformConfig[post.platform.toLowerCase()]?.label || post.platform}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Data de Publicação</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(post.scheduled_date), "PPP 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {post.clients && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Cliente</p>
                    <p className="text-sm text-muted-foreground">{post.clients.name}</p>
                  </div>
                </div>
              )}

              {post.campaigns && (
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Campanha</p>
                    <p className="text-sm text-muted-foreground">{post.campaigns.name}</p>
                  </div>
                </div>
              )}

              {assignedUsers.length > 0 && (
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="w-full">
                    <p className="text-sm font-medium mb-2">Atribuído a</p>
                    <PostAssignedUsers users={assignedUsers} showNames={true} size="md" />
                  </div>
                </div>
              )}

              {post.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Descrição</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {post.description}
                  </p>
                </div>
              )}

              {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex items-start gap-2">
                  <Hash className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Hashtags</p>
                    <div className="flex flex-wrap gap-1">
                      {post.hashtags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {post.mentions && post.mentions.length > 0 && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Menções</p>
                    <div className="flex flex-wrap gap-1">
                      {post.mentions.map((mention, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          @{mention}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {post.notes && (
                <div>
                  <p className="text-sm font-medium mb-1">Observações</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {post.notes}
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
            {(post.approval_history && Array.isArray(post.approval_history) && post.approval_history.length > 0) || creatorName ? (
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
                          <p className="text-sm">Postagem criada</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(post.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                            <span>•</span>
                            <span>por {creatorName}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Histórico de aprovações/mudanças */}
                    {post.approval_history && Array.isArray(post.approval_history) && post.approval_history.map((entry: any, index: number) => (
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
                  onDuplicate(post);
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
                ? `Tem certeza que deseja excluir sua postagem "${post.title}"?`
                : `Você está excluindo uma postagem criada por ${permissionCreatorName || creatorName}. Tem certeza que deseja excluir "${post.title}"?`
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
              Apenas o criador desta postagem ou um administrador pode excluí-la.
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
