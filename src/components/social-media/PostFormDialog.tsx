import { useState, useEffect } from "react";
import { useAIAssist, PostPrefillResult } from "@/hooks/useAIAssist";
import { AIPreFillStep } from "@/components/ui/ai-prefill-step";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSocialMediaPosts, SocialMediaPost } from "@/hooks/useSocialMediaPosts";
import { useSocialMediaSettings } from "@/hooks/useSocialMediaSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { SubtaskManager, Subtask } from "@/components/ui/subtask-manager";
import { MultiUserSelector } from "@/components/tasks/MultiUserSelector";
import { MultiClientSelector } from "@/components/clients/MultiClientSelector";
import { useClientRelations } from "@/hooks/useClientRelations";
import { FileAttachments, Attachment } from "@/components/ui/file-attachments";
import { WizardStepIndicator } from "@/components/ui/wizard-step-indicator";
import { WizardReviewStep } from "@/components/ui/wizard-review-step";
import { Info } from "lucide-react";

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
  const { getDefaultDueDateDaysBefore } = useSocialMediaSettings(currentAgency?.id);
  const { toast } = useToast();
  const { fetchClientIds, updateClientRelations } = useClientRelations();
  const [clients, setClients] = useState<Client[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [dueDateManuallyEdited, setDueDateManuallyEdited] = useState(false);
  const [formStep, setFormStep] = useState<number>(1);
  const { preFillPost, loading: aiLoading } = useAIAssist();

  // Helper para calcular due_date baseado em post_date
  const calculateDueDate = (postDate: string, daysBefore: number): string => {
    const date = new Date(postDate);
    date.setDate(date.getDate() - daysBefore);
    return date.toISOString();
  };

  // Helper para converter Date para formato datetime-local mantendo fuso horário local
  const toLocalDatetimeString = (date: Date) => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    creative_instructions: "",
    scheduled_date: defaultDate?.toISOString() || new Date().toISOString(),
    post_date: defaultDate?.toISOString() || new Date().toISOString(),
    due_date: "",
    post_type: "feed",
    platform: "instagram",
    status: "draft",
    priority: "medium",
    hashtags: "",
    notes: "",
    subtasks: [] as Subtask[],
  });

  // Calcular due_date inicial quando post_date muda e não foi editado manualmente
  useEffect(() => {
    if (!dueDateManuallyEdited && formData.post_date) {
      const daysBefore = getDefaultDueDateDaysBefore();
      const newDueDate = calculateDueDate(formData.post_date, daysBefore);
      setFormData(prev => ({ ...prev, due_date: newDueDate }));
    }
  }, [formData.post_date, dueDateManuallyEdited, getDefaultDueDateDaysBefore]);

  useEffect(() => {
    if (editPost) {
      const effectivePostDate = editPost.post_date || editPost.scheduled_date;
      setFormData({
        title: editPost.title,
        description: editPost.description || "",
        creative_instructions: (editPost as any).creative_instructions || "",
        scheduled_date: editPost.scheduled_date,
        post_date: effectivePostDate,
        due_date: editPost.due_date || "",
        post_type: editPost.post_type,
        platform: editPost.platform,
        status: editPost.status,
        priority: editPost.priority,
        hashtags: editPost.hashtags?.join(", ") || "",
        notes: editPost.notes || "",
        subtasks: editPost.subtasks || [],
      });
      // Se o post já tem due_date, consideramos que foi editado manualmente
      setDueDateManuallyEdited(!!editPost.due_date);
      // Carregar anexos existentes
      if (editPost.attachments && Array.isArray(editPost.attachments)) {
        setAttachments(editPost.attachments as unknown as Attachment[]);
      } else {
        setAttachments([]);
      }
    } else {
      const defaultPostDate = defaultDate?.toISOString() || new Date().toISOString();
      const daysBefore = getDefaultDueDateDaysBefore();
      // Na criação, forçar o primeiro status da lista (Briefing/draft)
      const firstStatus = customStatuses.length > 0 ? customStatuses[0].slug : "draft";
      setFormData({
        title: "",
        description: "",
        creative_instructions: "",
        scheduled_date: defaultPostDate,
        post_date: defaultPostDate,
        due_date: calculateDueDate(defaultPostDate, daysBefore),
        post_type: "feed",
        platform: "instagram",
        status: firstStatus,
        priority: "medium",
        hashtags: "",
        notes: "",
        subtasks: [],
      });
      setSelectedClientIds([]);
      setAttachments([]);
      setDueDateManuallyEdited(false);
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

  // Na criação, forçar primeiro status quando customStatuses carregar
  useEffect(() => {
    if (!editPost && customStatuses.length > 0) {
      setFormData(prev => ({ ...prev, status: customStatuses[0].slug }));
    }
  }, [customStatuses, editPost]);

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
        const currentDate = new Date(formData.post_date);
        const [hours, minutes] = preferredTime.split(':');
        currentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        const newPostDate = currentDate.toISOString();
        setFormData(prev => ({ ...prev, scheduled_date: newPostDate, post_date: newPostDate }));
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
          const newPostDate = currentDate.toISOString();
          setFormData(prev => ({ ...prev, scheduled_date: newPostDate, post_date: newPostDate }));
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
        client_id: selectedClientIds[0] || null,
        scheduled_date: formData.post_date,
        hashtags: formData.hashtags.split(",").map(h => h.trim()).filter(Boolean),
        creative_instructions: formData.creative_instructions || null,
        attachments: attachments as any,
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

  const isCreating = !editPost;

  // Helper labels
  const getPriorityLabel = (p: string) => ({ low: "Baixa", medium: "Média", high: "Alta" }[p] || p);
  const getPlatformLabel = (p: string) => activePlatforms.find(pl => pl.slug === p)?.name || p;
  const getContentTypeLabel = (t: string) => allContentTypes.find(ct => ct.slug === t)?.name || t;

  return (
    <Dialog open={open} onOpenChange={(o) => {
      onOpenChange(o);
      if (!o) setFormStep(1);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{editPost ? "Editar Postagem" : "Nova Postagem"}</DialogTitle>
        </DialogHeader>

        {/* Wizard indicator for creation - shows from step 2 onwards */}
        {isCreating && formStep > 1 && (
          <div className="flex-shrink-0 pb-2">
            <WizardStepIndicator
              currentStep={formStep - 1}
              totalSteps={4}
              stepLabels={["Básico", "Agendamento", "Detalhes", "Revisão"]}
            />
          </div>
        )}

        {/* Editing: show full form */}
        {editPost ? (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="description">Legenda</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} />
            </div>
            <div>
              <Label htmlFor="creative_instructions">Instruções de Arte</Label>
              <Textarea id="creative_instructions" value={formData.creative_instructions} onChange={(e) => setFormData({ ...formData, creative_instructions: e.target.value })} rows={3} placeholder="Headlines, CTAs, textos de apoio, roteiro para vídeo..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Plataforma *</Label>
                <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {activePlatforms.map(p => <SelectItem key={p.slug} value={p.slug}>{p.icon} {p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Conteúdo *</Label>
                <Select value={formData.post_type} onValueChange={(value) => setFormData({ ...formData, post_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allContentTypes.map(t => <SelectItem key={t.slug} value={t.slug}>{t.icon} {t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Clientes</Label>
              <MultiClientSelector clients={clients} selectedClientIds={selectedClientIds} onSelectionChange={setSelectedClientIds} placeholder="Selecionar clientes..." />
            </div>
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <h4 className="font-medium text-sm flex items-center gap-2">📅 Datas de Publicação e Entrega</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="post_date">Data de Postagem *</Label>
                  <Input id="post_date" type="datetime-local" value={toLocalDatetimeString(new Date(formData.post_date))} onChange={(e) => {
                    const localDateTime = new Date(e.target.value);
                    const newPostDate = localDateTime.toISOString();
                    setFormData({ ...formData, post_date: newPostDate, scheduled_date: newPostDate });
                    if (!dueDateManuallyEdited) {
                      const daysBefore = getDefaultDueDateDaysBefore();
                      const newDueDate = calculateDueDate(newPostDate, daysBefore);
                      setFormData(prev => ({ ...prev, due_date: newDueDate }));
                    }
                  }} required />
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Info className="h-3 w-3" />Quando o conteúdo vai ao ar</p>
                </div>
                <div>
                  <Label htmlFor="due_date">Data Limite da Arte</Label>
                  <Input id="due_date" type="datetime-local" value={formData.due_date ? toLocalDatetimeString(new Date(formData.due_date)) : ""} onChange={(e) => {
                    const localDateTime = new Date(e.target.value);
                    setFormData({ ...formData, due_date: localDateTime.toISOString() });
                    setDueDateManuallyEdited(true);
                  }} />
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Info className="h-3 w-3" />Até quando a arte precisa estar pronta</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Status *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {customStatuses.map(s => <SelectItem key={s.id} value={s.slug}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade *</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <MultiUserSelector users={profiles} selectedUserIds={selectedUserIds} onSelectionChange={setSelectedUserIds} />
            </div>
            <div>
              <Label htmlFor="hashtags">Hashtags (separadas por vírgula)</Label>
              <Input id="hashtags" value={formData.hashtags} onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })} placeholder="marketing, digital, socialmedia" />
            </div>
            <div>
              <Label htmlFor="notes">Observações Internas</Label>
              <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Anexos</Label>
              <FileAttachments attachments={attachments} onChange={setAttachments} bucket="post-attachments" entityId={editPost?.id} />
            </div>
            <SubtaskManager subtasks={formData.subtasks} onChange={(subtasks) => setFormData({ ...formData, subtasks })} />
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Atualizar"}</Button>
            </div>
          </form>
        ) : (
          <>
            {/* Step 1: AI */}
            {formStep === 1 && (
              <AIPreFillStep
                type="post"
                loading={aiLoading}
                onResult={() => {}}
                onSkip={() => setFormStep(2)}
                onSubmit={async (text) => {
                  const result = await preFillPost(text, currentAgency?.id);
                  if (result) {
                    if (result.mentioned_clients?.length && clients.length > 0) {
                      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      const matchedIds = clients
                        .filter((c) => result.mentioned_clients!.some((mention) => {
                          const nMention = normalize(mention);
                          const nClient = normalize(c.name);
                          return nClient.includes(nMention) || nMention.includes(nClient);
                        }))
                        .map((c) => c.id);
                      if (matchedIds.length > 0) setSelectedClientIds(matchedIds);
                    }
                    // Match fuzzy de usuários mencionados
                    if (result.mentioned_users?.length && profiles.length > 0) {
                      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      const matchedUserIds = profiles
                        .filter((p: any) => result.mentioned_users!.some((mention) => {
                          const nMention = normalize(mention);
                          const nProfile = normalize(p.name);
                          return nProfile.includes(nMention) || nMention.includes(nProfile);
                        }))
                        .map((p: any) => p.user_id);
                      if (matchedUserIds.length > 0) setSelectedUserIds(matchedUserIds);
                    }
                    setFormData((prev) => ({
                      ...prev,
                      title: result.title || prev.title,
                      description: result.description || prev.description,
                      creative_instructions: result.creative_instructions || prev.creative_instructions,
                      platform: result.platform || prev.platform,
                      post_type: result.post_type || prev.post_type,
                      hashtags: result.hashtags?.join(", ") || prev.hashtags,
                      priority: result.priority || prev.priority,
                      ...(result.suggested_date ? { post_date: result.suggested_date.split("T")[0], scheduled_date: result.suggested_date } : {}),
                    }));
                    setFormStep(2);
                  }
                }}
              />
            )}

            {/* Step 2: Básico */}
            {formStep === 2 && (
              <>
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label htmlFor="title">Título *</Label>
                      <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Título da postagem" />
                    </div>
                     <div>
                      <Label htmlFor="description">Legenda</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={4} />
                    </div>
                    <div>
                      <Label htmlFor="creative_instructions">Instruções de Arte</Label>
                      <Textarea id="creative_instructions" value={formData.creative_instructions} onChange={(e) => setFormData({ ...formData, creative_instructions: e.target.value })} rows={3} placeholder="Headlines, CTAs, textos de apoio, roteiro para vídeo..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Plataforma *</Label>
                        <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {activePlatforms.map(p => <SelectItem key={p.slug} value={p.slug}>{p.icon} {p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tipo de Conteúdo *</Label>
                        <Select value={formData.post_type} onValueChange={(value) => setFormData({ ...formData, post_type: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {allContentTypes.map(t => <SelectItem key={t.slug} value={t.slug}>{t.icon} {t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                  <Button variant="outline" onClick={() => setFormStep(1)}>Voltar</Button>
                  <Button onClick={() => {
                    if (!formData.title.trim()) {
                      toast({ title: "Erro", description: "O título é obrigatório.", variant: "destructive" });
                      return;
                    }
                    setFormStep(3);
                  }}>Próximo</Button>
                </DialogFooter>
              </>
            )}

            {/* Step 3: Agendamento */}
            {formStep === 3 && (
              <>
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label>Clientes</Label>
                      <MultiClientSelector clients={clients} selectedClientIds={selectedClientIds} onSelectionChange={setSelectedClientIds} placeholder="Selecionar clientes..." />
                    </div>
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                      <h4 className="font-medium text-sm flex items-center gap-2">📅 Datas de Publicação e Entrega</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="post_date">Data de Postagem *</Label>
                          <Input id="post_date" type="datetime-local" value={toLocalDatetimeString(new Date(formData.post_date))} onChange={(e) => {
                            const localDateTime = new Date(e.target.value);
                            const newPostDate = localDateTime.toISOString();
                            setFormData({ ...formData, post_date: newPostDate, scheduled_date: newPostDate });
                            if (!dueDateManuallyEdited) {
                              const daysBefore = getDefaultDueDateDaysBefore();
                              const newDueDate = calculateDueDate(newPostDate, daysBefore);
                              setFormData(prev => ({ ...prev, due_date: newDueDate }));
                            }
                          }} required />
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Info className="h-3 w-3" />Quando o conteúdo vai ao ar</p>
                        </div>
                        <div>
                          <Label htmlFor="due_date">Data Limite da Arte</Label>
                          <Input id="due_date" type="datetime-local" value={formData.due_date ? toLocalDatetimeString(new Date(formData.due_date)) : ""} onChange={(e) => {
                            const localDateTime = new Date(e.target.value);
                            setFormData({ ...formData, due_date: localDateTime.toISOString() });
                            setDueDateManuallyEdited(true);
                          }} />
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Info className="h-3 w-3" />Até quando a arte precisa estar pronta</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                  <Button variant="outline" onClick={() => setFormStep(2)}>Voltar</Button>
                  <Button onClick={() => setFormStep(4)}>Próximo</Button>
                </DialogFooter>
              </>
            )}

            {/* Step 4: Detalhes */}
            {formStep === 4 && (
              <>
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Status</Label>
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                          {customStatuses.find(s => s.slug === formData.status)?.name || "Briefing"}
                        </div>
                      </div>
                      <div>
                        <Label>Prioridade *</Label>
                        <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
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
                      <MultiUserSelector users={profiles} selectedUserIds={selectedUserIds} onSelectionChange={setSelectedUserIds} />
                    </div>
                    <div>
                      <Label htmlFor="hashtags">Hashtags (separadas por vírgula)</Label>
                      <Input id="hashtags" value={formData.hashtags} onChange={(e) => setFormData({ ...formData, hashtags: e.target.value })} placeholder="marketing, digital, socialmedia" />
                    </div>
                    <div>
                      <Label htmlFor="notes">Observações Internas</Label>
                      <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} />
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                  <Button variant="outline" onClick={() => setFormStep(3)}>Voltar</Button>
                  <Button onClick={() => setFormStep(5)}>Próximo</Button>
                </DialogFooter>
              </>
            )}

            {/* Step 5: Revisão */}
            {formStep === 5 && (
              <>
                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                  <div className="grid gap-4 py-4">
                    <WizardReviewStep
                      fields={[
                        { label: "Título", value: formData.title },
                        { label: "Plataforma", value: getPlatformLabel(formData.platform) },
                        { label: "Tipo", value: getContentTypeLabel(formData.post_type) },
                        { label: "Legenda", value: formData.description },
                        { label: "Instruções de Arte", value: formData.creative_instructions },
                        { label: "Clientes", value: selectedClientIds.map(id => clients.find(c => c.id === id)?.name).filter(Boolean).join(", ") },
                        { label: "Data de Postagem", value: new Date(formData.post_date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
                        { label: "Data Limite da Arte", value: formData.due_date ? new Date(formData.due_date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "" },
                        { label: "Prioridade", value: getPriorityLabel(formData.priority) },
                        { label: "Usuários", value: selectedUserIds.map(id => profiles.find(p => p.user_id === id)?.name).filter(Boolean).join(", ") },
                        { label: "Hashtags", value: formData.hashtags },
                        { label: "Observações", value: formData.notes },
                      ]}
                    />
                    <div>
                      <Label>Anexos</Label>
                      <FileAttachments attachments={attachments} onChange={setAttachments} bucket="post-attachments" />
                    </div>
                    <SubtaskManager subtasks={formData.subtasks} onChange={(subtasks) => setFormData({ ...formData, subtasks })} />
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0 pt-4 border-t">
                  <Button variant="outline" onClick={() => setFormStep(4)}>Voltar</Button>
                  <Button onClick={(e) => { e.preventDefault(); handleSubmit(e as any); }} disabled={loading}>
                    {loading ? "Salvando..." : "Criar Postagem"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
