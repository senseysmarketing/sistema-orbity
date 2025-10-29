import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Evento customizado para sincronização entre componentes
const POST_ASSIGNMENTS_UPDATED_EVENT = 'post-assignments-updated';

interface PostAssignment {
  id: string;
  post_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

interface PostAssignmentWithProfile extends PostAssignment {
  profiles: {
    id: string;
    user_id: string;
    name: string;
    role: string;
  };
}

export function usePostAssignments() {
  const [assignments, setAssignments] = useState<PostAssignmentWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAssignments = useCallback(async (postId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('post_assignments')
        .select('*');

      if (postId) {
        query = query.eq('post_id', postId);
      }

      const { data: assignmentData, error: assignmentError } = await query;

      if (assignmentError) {
        console.error('Error fetching post assignments:', assignmentError);
        throw assignmentError;
      }

      // Buscar os perfis dos usuários
      if (assignmentData && assignmentData.length > 0) {
        const userIds = assignmentData.map(a => a.user_id);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_id, name, role')
          .in('user_id', userIds);

        if (profileError) throw profileError;

        // Combinar os dados
        const combinedData = assignmentData.map(assignment => {
          const profile = profileData?.find(p => p.user_id === assignment.user_id);
          return {
            ...assignment,
            profiles: profile || {
              id: '',
              user_id: assignment.user_id,
              name: 'Usuário desconhecido',
              role: 'unknown'
            }
          };
        });

        setAssignments(combinedData);
      } else {
        setAssignments([]);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar atribuições",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const assignUsersToPost = async (postId: string, userIds: string[]) => {
    // Salvar estado anterior para rollback
    const previousAssignments = [...assignments];
    
    try {
      // Atualização otimista: atualizar UI imediatamente
      const newAssignments = userIds.map(userId => ({
        id: `temp-${userId}`,
        post_id: postId,
        user_id: userId,
        assigned_at: new Date().toISOString(),
        assigned_by: null,
        profiles: {
          id: '',
          user_id: userId,
          name: 'Carregando...',
          role: 'agency_user'
        }
      }));
      setAssignments(newAssignments);

      // Remover atribuições existentes
      await supabase
        .from('post_assignments')
        .delete()
        .eq('post_id', postId);

      // Adicionar novas atribuições
      if (userIds.length > 0) {
        const assignmentsToInsert = userIds.map(userId => ({
          post_id: postId,
          user_id: userId
        }));

        const { error } = await supabase
          .from('post_assignments')
          .insert(assignmentsToInsert);

        if (error) throw error;
      }

      // Buscar dados completos
      await fetchAssignments(postId);
      
      // Emitir evento para outros componentes
      window.dispatchEvent(new CustomEvent(POST_ASSIGNMENTS_UPDATED_EVENT, { 
        detail: { postId, userIds } 
      }));
      
      toast({
        title: "Sucesso",
        description: "Usuários atribuídos ao post com sucesso!",
      });
    } catch (error: any) {
      // Rollback em caso de erro
      setAssignments(previousAssignments);
      
      toast({
        title: "Erro ao atribuir usuários",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAssignedUsers = (postId: string) => {
    const postAssignments = assignments.filter(assignment => assignment.post_id === postId);
    return postAssignments.map(assignment => assignment);
  };

  const getPostsForUser = (userId: string) => {
    return assignments
      .filter(assignment => assignment.user_id === userId)
      .map(assignment => assignment.post_id);
  };

  const removeUserFromPost = async (postId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('post_assignments')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchAssignments(postId);
      
      toast({
        title: "Sucesso",
        description: "Usuário removido do post com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Listener para sincronização em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('post-assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_assignments'
        },
        (payload) => {
          console.log('Post assignment change detected:', payload);
          // Recarregar atribuições quando houver mudanças
          fetchAssignments();
        }
      )
      .subscribe();

    // Listener para eventos customizados
    const handleAssignmentUpdate = (event: any) => {
      fetchAssignments(event.detail?.postId);
    };
    
    window.addEventListener(POST_ASSIGNMENTS_UPDATED_EVENT, handleAssignmentUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(POST_ASSIGNMENTS_UPDATED_EVENT, handleAssignmentUpdate);
    };
  }, [fetchAssignments]);

  return {
    assignments,
    loading,
    fetchAssignments,
    assignUsersToPost,
    getAssignedUsers,
    getPostsForUser,
    removeUserFromPost
  };
}
