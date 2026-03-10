import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Evento customizado para sincronização entre componentes
const ASSIGNMENTS_UPDATED_EVENT = 'task-assignments-updated';

interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

interface TaskAssignmentWithProfile extends TaskAssignment {
  profiles: {
    id: string;
    user_id: string;
    name: string;
    role: string;
  };
}

export function useTaskAssignments() {
  const [assignments, setAssignments] = useState<TaskAssignmentWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const isOperatingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchAssignments = useCallback(async (taskId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('task_assignments')
        .select('*')
        .range(0, 4999);

      if (taskId) {
        query = query.eq('task_id', taskId);
      }

      const { data: assignmentData, error: assignmentError } = await query;

      if (assignmentError) {
        console.error('Error fetching assignments:', assignmentError);
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

        if (taskId) {
          setAssignments(prev => [
            ...prev.filter(a => a.task_id !== taskId),
            ...combinedData
          ]);
        } else {
          setAssignments(combinedData);
        }
      } else {
        if (taskId) {
          setAssignments(prev => prev.filter(a => a.task_id !== taskId));
        } else {
          setAssignments([]);
        }
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

  const assignUsersToTask = async (taskId: string, userIds: string[]) => {
    const previousAssignments = [...assignments];
    isOperatingRef.current = true;
    
    try {
      const newAssignments = userIds.map(userId => ({
        id: `temp-${userId}`,
        task_id: taskId,
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
      setAssignments(prev => [
        ...prev.filter(a => a.task_id !== taskId),
        ...newAssignments
      ]);

      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId);

      if (userIds.length > 0) {
        const assignmentsToInsert = userIds.map(userId => ({
          task_id: taskId,
          user_id: userId
        }));

        const { error } = await supabase
          .from('task_assignments')
          .insert(assignmentsToInsert);

        if (error) throw error;
      }

      await fetchAssignments(taskId);
      
      window.dispatchEvent(new CustomEvent(ASSIGNMENTS_UPDATED_EVENT, { 
        detail: { taskId, userIds } 
      }));
      
      toast({
        title: "Sucesso",
        description: "Usuários atribuídos à tarefa com sucesso!",
      });
    } catch (error: any) {
      setAssignments(previousAssignments);
      
      toast({
        title: "Erro ao atribuir usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      isOperatingRef.current = false;
    }
  };

  const getAssignedUsers = (taskId: string) => {
    const taskAssignments = assignments.filter(assignment => assignment.task_id === taskId);
    // Retorna no formato que os componentes esperam
    return taskAssignments.map(assignment => assignment);
  };

  const getTasksForUser = (userId: string) => {
    return assignments
      .filter(assignment => assignment.user_id === userId)
      .map(assignment => assignment.task_id);
  };

  const removeUserFromTask = async (taskId: string, userId: string) => {
    isOperatingRef.current = true;
    try {
      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchAssignments(taskId);
      
      toast({
        title: "Sucesso",
        description: "Usuário removido da tarefa com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      isOperatingRef.current = false;
    }
  };

  // Listener para sincronização em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('task-assignments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignments'
        },
        (payload) => {
          console.log('Task assignment change detected:', payload);
          // Recarregar atribuições quando houver mudanças
          fetchAssignments();
        }
      )
      .subscribe();

    // Listener para eventos customizados
    const handleAssignmentUpdate = (event: any) => {
      fetchAssignments(event.detail?.taskId);
    };
    
    window.addEventListener(ASSIGNMENTS_UPDATED_EVENT, handleAssignmentUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(ASSIGNMENTS_UPDATED_EVENT, handleAssignmentUpdate);
    };
  }, [fetchAssignments]);

  return {
    assignments,
    loading,
    fetchAssignments,
    assignUsersToTask,
    getAssignedUsers,
    getTasksForUser,
    removeUserFromTask
  };
}