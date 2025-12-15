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
import { useQuery } from "@tanstack/react-query";
import { SubtaskManager, Subtask } from "@/components/ui/subtask-manager";
import { MultiUserSelector } from "@/components/tasks/MultiUserSelector";
import { MultiClientSelector } from "@/components/clients/MultiClientSelector";
import { useClientRelations } from "@/hooks/useClientRelations";

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
  const { fetchClientIds, updateClientRelations } = useClientRelations();
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Helper para converter Date para formato datetime-local mantendo fuso horário local
  const toLocalDatetimeString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduled_date: defaultDate?.toISOString() || new Date().toISOString(),
    post_type: "feed",
    platform: "instagram",
    status: "draft",
    priority: "medium",
    hashtags: "",
    notes: "",
    subtasks: [] as Subtask[],
  });

  useEffect(() => {
    if (editPost) {
      setFormData({
        title: editPost.title,
        description: editPost.description || "",
        scheduled_date: editPost.scheduled_date,
        post_type: editPost.post_type,
        platform: editPost.platform,
        status: editPost.status,
        priority: editPost.priority,
        hashtags: editPost.hashtags?.join(", ") || "",
        notes: editPost.notes || "",
        subtasks: editPost.subtasks || [],
      });
    } else {
      setFormData({
        title: "",
        description: "",
        scheduled_date: defaultDate?.toISOString() || new Date().toISOString(),
        post_type: "feed",
        platform: "instagram",
        status: "draft",
        priority: "medium",
        hashtags: "",
        notes: "",
        subtasks: [],
      });
      setSelectedClientIds([]);
    }
  }, [editPost, defaultDate, open]);

  // Buscar clientes e perfis
  useEffect(() => {
    const fetchData = async () => {
      if (!currentAgency?.id) return;
      
      // Buscar clientes
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .eq('agency_id', currentAgency.id)
        .eq('active', true)
        .order('name', { ascending: true });
      if (clientsData) setClients(clientsData);

      // Buscar perfis de usuários da agência
      const { data: agencyUsers } = await supabase
        .from('agency_users')
        .select('user_id')
        .eq('agency_id', currentAgency.id);
      
      if (agencyUsers) {
        const userIds = agencyUsers.map(u => u.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, user_id, name, role')
          .in('user_id', userIds);
        if (profilesData) setProfiles(profilesData);
      }
    };
    fetchData();
  }, [currentAgency?.id]);

  // Carregar atribuições e clientes do post sendo editado
  useEffect(() => {
    const fetchAssignmentsAndClients = async () => {
      if (!editPost?.id) {
        setSelectedUserIds([]);
        setSelectedClientIds([]);
        return;
      }

      // Fetch user assignments
      const { data: userAssignments } = await supabase
        .from('post_assignments')
        .select('user_id')
        .eq('post_id', editPost.id);
      
      if (userAssignments) {
        setSelectedUserIds(userAssignments.map(a => a.user_id));
      }

      // Fetch client relations
      const clientIds = await fetchClientIds("post", editPost.id);
      if (clientIds.length > 0) {
        setSelectedClientIds(clientIds);
      } else if (editPost.client_id) {
        // Fallback to legacy client_id
        setSelectedClientIds([editPost.client_id]);
      }
    };
    fetchAssignmentsAndClients();
  }, [editPost?.id]);

  // Tipos de conteúdo padrão
  const defaultContentTypes = [
    { slug: 'feed', name: 'Feed', icon: '📱' },
    { slug: 'stories', name: 'Stories', icon: '📖' },
    { slug: 'reels', name: 'Reels', icon: '🎬' },
    { slug: 'carrossel', name: 'Carrossel', icon: '🎠' },
    { slug: 'video', name: 'Vídeo', icon: '🎥' },
  ];

  // Plataformas padrão
  const defaultPlatforms = [
    { slug: 'instagram', name: 'Instagram', icon: '📷' },
    { slug: 'facebook', name: 'Facebook', icon: '👥' },
    { slug: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { slug: 'twitter', name: 'Twitter', icon: '🐦' },
    { slug: 'tiktok', name: 'TikTok', icon: '🎵' },
    { slug: 'youtube', name: 'YouTube', icon: '📺' },
  ];

  // Buscar tipos de conteúdo customizados e combinar com padrões
  const { data: customContentTypes = [] } = useQuery({
    queryKey: ['content-types', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from('social_media_content_types')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true)
        .eq('is_default', false);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  // Buscar configurações de tipos de conteúdo padrão desativados
  const { data: disabledDefaultTypes = [] } = useQuery({
    queryKey: ['disabled-content-types', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from('social_media_content_types')
        .select('slug')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', false)
        .eq('is_default', true);
      if (error) throw error;
      return (data || []).map(p => p.slug);
    },
    enabled: !!currentAgency?.id,
  });

  // Filtrar tipos de conteúdo padrão ativos e combinar com customizados
  const allContentTypes = [
    ...defaultContentTypes.filter(t => !disabledDefaultTypes.includes(t.slug)),
    ...customContentTypes
  ];

  // Buscar plataformas ativas customizadas e combinar com padrões
  const { data: customPlatforms = [] } = useQuery({
    queryKey: ['custom-platforms', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from('social_media_platforms')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true)
        .eq('is_default', false);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  // Buscar configurações de plataformas padrão desativadas
  const { data: disabledDefaultPlatforms = [] } = useQuery({
    queryKey: ['disabled-platforms', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from('social_media_platforms')
        .select('slug')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', false)
        .eq('is_default', true);
      if (error) throw error;
      return (data || []).map(p => p.slug);
    },
    enabled: !!currentAgency?.id,
  });

  // Filtrar plataformas padrão ativas e combinar com customizadas
  const activePlatforms = [
    ...defaultPlatforms.filter(p => !disabledDefaultPlatforms.includes(p.slug)),
    ...customPlatforms
  ];

  // Buscar status customizados
  const { data: customStatuses = [] } = useQuery({
    queryKey: ['custom-statuses', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from('social_media_custom_statuses')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('is_active', true)
        .order('order_position', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency?.id,
  });

  // Buscar horários padrão quando plataforma ou cliente mudar
  useEffect(() => {
    const fetchSchedulePreference = async () => {
      if (!currentAgency?.id || editPost) return;

      const firstClientId = selectedClientIds[0];

      // Buscar preferência específica do cliente primeiro
      let query = supabase
        .from('social_media_schedule_preferences')
        .select('preferred_times')
        .eq('agency_id', currentAgency.id)
        .eq('platform', formData.platform);

      // Se tiver cliente, buscar preferência específica
      if (firstClientId) {
        query = query.eq('client_id', firstClientId);
      } else {
        // Se não tiver cliente, buscar preferência geral (client_id null)
        query = query.is('client_id', null);
      }

      const { data, error } = await query.maybeSingle();

      // Se não encontrou preferência específica e tem cliente, buscar preferência geral
      let preferenceData = data;
      if (!preferenceData && firstClientId) {
        const { data: generalData } = await supabase
          .from('social_media_schedule_preferences')
          .select('preferred_times')
          .eq('agency_id', currentAgency.id)
          .eq('platform', formData.platform)
          .is('client_id', null)
          .maybeSingle();
        
        preferenceData = generalData;
      }

      if (preferenceData && preferenceData.preferred_times && Array.isArray(preferenceData.preferred_times) && preferenceData.preferred_times.length > 0) {
        // Pegar o primeiro horário preferido
        const preferredTime = preferenceData.preferred_times[0] as string;
        const currentDate = new Date(formData.scheduled_date);
        const [hours, minutes] = preferredTime.split(':');
        currentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        setFormData(prev => ({ ...prev, scheduled_date: currentDate.toISOString() }));
      }
    };

    fetchSchedulePreference();
  }, [formData.platform, selectedClientIds, currentAgency?.id, editPost, open]);

  // Aplicar horário padrão ao abrir o modal
  useEffect(() => {
    if (open && !editPost && defaultDate) {
      const fetchInitialSchedule = async () => {
        if (!currentAgency?.id) return;

        // Buscar preferência geral para a plataforma padrão (instagram)
        const { data } = await supabase
          .from('social_media_schedule_preferences')
          .select('preferred_times')
          .eq('agency_id', currentAgency.id)
          .eq('platform', 'instagram')
          .is('client_id', null)
          .maybeSingle();

        if (data && data.preferred_times && Array.isArray(data.preferred_times) && data.preferred_times.length > 0) {
          const preferredTime = data.preferred_times[0] as string;
          const currentDate = new Date(defaultDate);
          const [hours, minutes] = preferredTime.split(':');
          currentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          setFormData(prev => ({ ...prev, scheduled_date: currentDate.toISOString() }));
        }
      };

      fetchInitialSchedule();
    }
  }, [open, editPost, defaultDate, currentAgency?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        client_id: selectedClientIds[0] || null, // Keep first client for backward compatibility
        hashtags: formData.hashtags.split(",").map(h => h.trim()).filter(Boolean),
        attachments: [],
        mentions: [],
        approval_history: [],
        subtasks: formData.subtasks,
      };

      if (editPost?.id) {
        // Detectar mudanças
        const changes: string[] = [];
        
        if (editPost.title !== formData.title) {
          changes.push(`Título: "${editPost.title}" → "${formData.title}"`);
        }
        
        if (editPost.description !== formData.description) {
          changes.push(`Descrição alterada`);
        }
        
        const oldDate = new Date(editPost.scheduled_date).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        const newDate = new Date(formData.scheduled_date).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        if (oldDate !== newDate) {
          changes.push(`Data: ${oldDate} → ${newDate}`);
        }
        
        const statusLabels: Record<string, string> = {
          draft: "Briefing",
          in_creation: "Em Criação",
          pending_approval: "Aguardando",
          approved: "Aprovado",
          published: "Publicado",
          rejected: "Rejeitado",
        };
        
        if (editPost.status !== formData.status) {
          changes.push(`Status: ${statusLabels[editPost.status] || editPost.status} → ${statusLabels[formData.status] || formData.status}`);
        }
        
        const platformLabels: Record<string, string> = {
          instagram: "Instagram",
          facebook: "Facebook",
          linkedin: "LinkedIn",
          twitter: "Twitter",
          youtube: "YouTube",
          tiktok: "TikTok",
        };
        
        if (editPost.platform !== formData.platform) {
          changes.push(`Plataforma: ${platformLabels[editPost.platform] || editPost.platform} → ${platformLabels[formData.platform] || formData.platform}`);
        }
        
        const postTypeLabels: Record<string, string> = {
          feed: "Feed",
          stories: "Stories",
          reels: "Reels",
          carrossel: "Carrossel",
          video: "Vídeo",
        };
        
        if (editPost.post_type !== formData.post_type) {
          changes.push(`Tipo: ${postTypeLabels[editPost.post_type] || editPost.post_type} → ${postTypeLabels[formData.post_type] || formData.post_type}`);
        }

        // Adicionar histórico com as mudanças
        const currentHistory = Array.isArray(editPost.approval_history) ? editPost.approval_history : [];
        
        // Obter nome do usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        let userName = "Usuário";
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", user.id)
            .single();
          if (profile) userName = profile.name;
        }
        
        const newHistoryEntry = {
          action: changes.length > 0 ? `Postagem editada: ${changes.join("; ")}` : "Postagem editada",
          timestamp: new Date().toISOString(),
          user_name: userName,
        };

        await updatePost(editPost.id, {
          ...data,
          approval_history: [...currentHistory, newHistoryEntry] as any,
        });

        // Atualizar atribuições de usuários
        await supabase
          .from('post_assignments')
          .delete()
          .eq('post_id', editPost.id);

        if (selectedUserIds.length > 0) {
          const assignments = selectedUserIds.map(userId => ({
            post_id: editPost.id,
            user_id: userId
          }));
          await supabase.from('post_assignments').insert(assignments);
        }

        // Atualizar relações de clientes
        await updateClientRelations("post", editPost.id, selectedClientIds);
        
        toast({ title: "Postagem atualizada com sucesso!" });
      } else {
        const createdPost = await createPost(data);
        
        // Criar atribuições para o novo post
        if (createdPost && selectedUserIds.length > 0) {
          const assignments = selectedUserIds.map(userId => ({
            post_id: createdPost.id,
            user_id: userId
          }));
          await supabase.from('post_assignments').insert(assignments);
        }

        // Criar relações de clientes para o novo post
        if (createdPost && selectedClientIds.length > 0) {
          await updateClientRelations("post", createdPost.id, selectedClientIds);
        }
        
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
                  {activePlatforms.map(platform => (
                    <SelectItem key={platform.slug} value={platform.slug}>
                      {platform.icon} {platform.name}
                    </SelectItem>
                  ))}
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
                  {allContentTypes.map(type => (
                    <SelectItem key={type.slug} value={type.slug}>
                      {type.icon} {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Clientes</Label>
              <MultiClientSelector
                clients={clients}
                selectedClientIds={selectedClientIds}
                onSelectionChange={setSelectedClientIds}
                placeholder="Selecionar clientes..."
              />
            </div>

            <div>
              <Label htmlFor="scheduled_date">Data/Hora de Publicação *</Label>
              <Input
                id="scheduled_date"
                type="datetime-local"
                value={toLocalDatetimeString(new Date(formData.scheduled_date))}
                onChange={(e) => {
                  // Converter o valor local para ISO mantendo o fuso horário correto
                  const localDateTime = new Date(e.target.value);
                  setFormData({ ...formData, scheduled_date: localDateTime.toISOString() });
                }}
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
                  <SelectItem value="in_creation">Em Criação</SelectItem>
                  <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                  {customStatuses.map(status => (
                    <SelectItem key={status.id} value={status.slug}>
                      {status.name}
                    </SelectItem>
                  ))}
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
            <Label>Atribuir a Usuários</Label>
            <MultiUserSelector
              users={profiles}
              selectedUserIds={selectedUserIds}
              onSelectionChange={setSelectedUserIds}
            />
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

          <SubtaskManager
            subtasks={formData.subtasks}
            onChange={(subtasks) => setFormData({ ...formData, subtasks })}
          />

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
