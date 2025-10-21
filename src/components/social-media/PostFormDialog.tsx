import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSocialMediaPosts, SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";

interface PostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  editPost?: SocialMediaPost | null;
}

interface Client {
  id: string;
  name: string;
}

export function PostFormDialog({ open, onOpenChange, defaultDate, editPost }: PostFormDialogProps) {
  const { createPost, updatePost } = useSocialMediaPosts();
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    client_id: "",
    scheduled_date: defaultDate?.toISOString() || new Date().toISOString(),
    post_type: "feed",
    platform: "instagram",
    status: "draft",
    priority: "medium",
    hashtags: "",
    notes: "",
  });

  useEffect(() => {
    if (editPost) {
      setFormData({
        title: editPost.title,
        description: editPost.description || "",
        client_id: editPost.client_id || "",
        scheduled_date: editPost.scheduled_date,
        post_type: editPost.post_type,
        platform: editPost.platform,
        status: editPost.status,
        priority: editPost.priority,
        hashtags: editPost.hashtags?.join(", ") || "",
        notes: editPost.notes || "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        client_id: "",
        scheduled_date: defaultDate?.toISOString() || new Date().toISOString(),
        post_type: "feed",
        platform: "instagram",
        status: "draft",
        priority: "medium",
        hashtags: "",
        notes: "",
      });
    }
  }, [editPost, defaultDate, open]);

  useEffect(() => {
    const fetchClients = async () => {
      if (!currentAgency?.id) return;
      const { data } = await supabase
        .from('clients')
        .select('id, name')
        .eq('agency_id', currentAgency.id)
        .eq('active', true);
      if (data) setClients(data);
    };
    fetchClients();
  }, [currentAgency?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        hashtags: formData.hashtags.split(",").map(h => h.trim()).filter(Boolean),
        attachments: [],
        mentions: [],
        approval_history: [],
      };

      if (editPost?.id) {
        await updatePost(editPost.id, data);
        toast({ title: "Postagem atualizada com sucesso!" });
      } else {
        await createPost(data);
        toast({ title: "Postagem criada com sucesso!" });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ 
        title: "Erro ao salvar postagem", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editPost ? "Editar Postagem" : "Nova Postagem"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Legenda/Texto</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform">Plataforma *</Label>
              <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="twitter">Twitter</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="post_type">Tipo de Conteúdo *</Label>
              <Select value={formData.post_type} onValueChange={(value) => setFormData({ ...formData, post_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feed">Feed</SelectItem>
                  <SelectItem value="stories">Stories</SelectItem>
                  <SelectItem value="reels">Reels</SelectItem>
                  <SelectItem value="carrossel">Carrossel</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="client_id">Cliente</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="scheduled_date">Data/Hora de Publicação *</Label>
              <Input
                id="scheduled_date"
                type="datetime-local"
                value={formData.scheduled_date.slice(0, 16)}
                onChange={(e) => setFormData({ ...formData, scheduled_date: new Date(e.target.value).toISOString() })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridade *</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="hashtags">Hashtags (separadas por vírgula)</Label>
            <Input
              id="hashtags"
              value={formData.hashtags}
              onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })}
              placeholder="marketing, digital, socialmedia"
            />
          </div>

          <div>
            <Label htmlFor="notes">Observações Internas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : editPost ? "Atualizar" : "Criar Postagem"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
