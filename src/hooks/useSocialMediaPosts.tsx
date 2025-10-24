import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';
import { toast } from 'sonner';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface SocialMediaPost {
  id: string;
  title: string;
  description?: string | null;
  client_id?: string | null;
  scheduled_date: string;
  post_type: string;
  platform: string;
  status: string;
  priority: string;
  attachments: any;
  hashtags: string[] | null;
  mentions: string[] | null;
  approval_history: any;
  campaign_id?: string | null;
  notes?: string | null;
  created_by: string;
  agency_id: string;
  created_at: string;
  updated_at: string;
  subtasks?: Subtask[];
  clients?: {
    name: string;
  } | null;
  campaigns?: {
    name: string;
  } | null;
}
const POSTS_UPDATED_EVENT = 'social-media-posts-updated';
const postsCache: Record<string, SocialMediaPost[]> = {};

export function useSocialMediaPosts() {
  const { currentAgency } = useAgency();
  const [posts, setPosts] = useState<SocialMediaPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    if (!currentAgency?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('social_media_posts')
        .select(`
          *,
          clients(name),
          campaigns(name)
        `)
        .eq('agency_id', currentAgency.id)
        .eq('archived', false)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      const formattedData = (data || []).map(post => ({
        ...post,
        subtasks: Array.isArray(post.subtasks) ? post.subtasks as unknown as Subtask[] : []
      })) as SocialMediaPost[];
      
      setPosts(formattedData);
      if (currentAgency?.id) {
        postsCache[currentAgency.id] = formattedData;
      }
    } catch (error: any) {
      toast.error('Erro ao carregar postagens: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [currentAgency?.id]);

  // Sync posts across components using a lightweight in-memory cache and custom event
  useEffect(() => {
    if (!currentAgency?.id) return;

    const handler = (e: CustomEvent<{ agencyId: string }>) => {
      if (e.detail?.agencyId === currentAgency.id) {
        const cached = postsCache[currentAgency.id];
        if (cached) setPosts(cached);
      }
    };

    // Prefill from cache immediately (no flicker)
    const cached = postsCache[currentAgency.id];
    if (cached && cached.length > 0) {
      setPosts(cached);
      setLoading(false);
    }

    const listener = (ev: Event) => handler(ev as CustomEvent<{ agencyId: string }>);
    window.addEventListener(POSTS_UPDATED_EVENT, listener as EventListener);
    return () => window.removeEventListener(POSTS_UPDATED_EVENT, listener as EventListener);
  }, [currentAgency?.id]);

  const createPost = async (postData: Partial<SocialMediaPost>) => {
    if (!currentAgency?.id) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const payload: any = {
        ...postData,
        agency_id: currentAgency.id,
        created_by: userData.user.id,
        notification_sent_at: null, // Garantir que notificação será enviada
      };

      const { data, error } = await supabase
        .from('social_media_posts')
        .insert(payload)
        .select(`
          *,
          clients(name),
          campaigns(name)
        `)
        .single();

      if (error) throw error;
      
      const formattedPost = {
        ...data,
        subtasks: Array.isArray(data.subtasks) ? data.subtasks as unknown as Subtask[] : []
      } as SocialMediaPost;
      
      // Atualização otimista - adiciona imediatamente ao estado local
      setPosts(prev => [...prev, formattedPost]);

      // Atualiza cache global e notifica outras instâncias
      const agencyId = currentAgency.id;
      const prevCache = postsCache[agencyId] || [];
      postsCache[agencyId] = [...prevCache, formattedPost];
      window.dispatchEvent(new CustomEvent(POSTS_UPDATED_EVENT, { detail: { agencyId } }));

      toast.success('Postagem criada com sucesso');
      return data;
    } catch (error: any) {
      toast.error('Erro ao criar postagem: ' + error.message);
      throw error;
    }

  };

  const updatePost = async (id: string, updates: Partial<SocialMediaPost>) => {
    try {
      // Se scheduled_date mudou, resetar notification_sent_at
      const finalUpdates: any = { ...updates };
      if (updates.scheduled_date) {
        const originalPost = posts.find(p => p.id === id);
        if (originalPost && originalPost.scheduled_date !== updates.scheduled_date) {
          finalUpdates.notification_sent_at = null;
        }
      }

      // Atualização otimista - atualiza imediatamente no estado local
      setPosts(prev => prev.map(post =>
        post.id === id ? { ...post, ...finalUpdates } : post
      ));

      // Atualiza cache global e notifica outras instâncias
      if (currentAgency?.id) {
        const agencyId = currentAgency.id;
        const source = postsCache[agencyId] || [];
        postsCache[agencyId] = source.map(post =>
          post.id === id ? { ...post, ...finalUpdates } as SocialMediaPost : post
        );
        window.dispatchEvent(new CustomEvent(POSTS_UPDATED_EVENT, { detail: { agencyId } }));
      }

      const { error } = await supabase
        .from('social_media_posts')
        .update(finalUpdates)
        .eq('id', id);

      if (error) {
        // Reverte a atualização otimista em caso de erro
        fetchPosts();
        throw error;
      }
      
      toast.success('Postagem atualizada');
    } catch (error: any) {
      toast.error('Erro ao atualizar postagem: ' + error.message);
      throw error;
    }
  };

  const deletePost = async (id: string) => {
    try {
      // Atualização otimista - remove imediatamente do estado local
      setPosts(prev => prev.filter(post => post.id !== id));

      // Atualiza cache global e notifica outras instâncias
      if (currentAgency?.id) {
        const agencyId = currentAgency.id;
        const source = postsCache[agencyId] || [];
        postsCache[agencyId] = source.filter(post => post.id !== id);
        window.dispatchEvent(new CustomEvent(POSTS_UPDATED_EVENT, { detail: { agencyId } }));
      }

      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', id);

      if (error) {
        // Reverte a remoção otimista em caso de erro
        fetchPosts();
        throw error;
      }
      
      toast.success('Postagem excluída');
    } catch (error: any) {
      toast.error('Erro ao excluir postagem: ' + error.message);
      throw error;
    }
  };

  return {
    posts,
    loading,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
  };
}
