import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pencil, Trash2, Calendar, User, Hash, Building2, Target, History } from "lucide-react";
import { SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";

interface PostDetailsDialogProps {
  post: SocialMediaPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (post: SocialMediaPost) => void;
  onDelete: (postId: string) => void;
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

export function PostDetailsDialog({ post, open, onOpenChange, onEdit, onDelete }: PostDetailsDialogProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

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

            {/* Histórico de Movimentações */}
            {post.approval_history && Array.isArray(post.approval_history) && post.approval_history.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Histórico de Movimentações</p>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {post.approval_history.map((entry: any, index: number) => (
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
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAlert(true)}
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

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a postagem "{post.title}"? Esta ação não pode ser desfeita.
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
    </>
  );
}
