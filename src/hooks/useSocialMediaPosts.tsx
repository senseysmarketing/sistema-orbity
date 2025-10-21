import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';
import { toast } from 'sonner';

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
  clients?: {
    name: string;
  } | null;
  campaigns?: {
    name: string;
  } | null;
}

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
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setPosts((data || []) as SocialMediaPost[]);
    } catch (error: any) {
      toast.error('Erro ao carregar postagens: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
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
      };

      const { data, error } = await supabase
        .from('social_media_posts')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Postagem criada com sucesso');
      fetchPosts();
      return data;
    } catch (error: any) {
      toast.error('Erro ao criar postagem: ' + error.message);
      throw error;
    }
  };

  const updatePost = async (id: string, updates: Partial<SocialMediaPost>) => {
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Postagem atualizada');
      fetchPosts();
    } catch (error: any) {
      toast.error('Erro ao atualizar postagem: ' + error.message);
      throw error;
    }
  };

  const deletePost = async (id: string) => {
    try {
      const { error } = await supabase
        .from('social_media_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Postagem excluída');
      fetchPosts();
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
