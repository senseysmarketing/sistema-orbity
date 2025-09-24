import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

  const fetchAssignments = async (taskId?: string) => {
    setLoading(true);
    try {
      let query = supabase
        .from('task_assignments')
        .select('*');

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
  };

  const assignUsersToTask = async (taskId: string, userIds: string[]) => {
    try {
      // Primeiro remove todas as atribuições existentes
      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId);

      // Depois adiciona as novas atribuições
      if (userIds.length > 0) {
        const assignments = userIds.map(userId => ({
          task_id: taskId,
          user_id: userId
        }));

        const { error } = await supabase
          .from('task_assignments')
          .insert(assignments);

        if (error) throw error;
      }

      await fetchAssignments(taskId);
      
      toast({
        title: "Sucesso",
        description: "Usuários atribuídos à tarefa com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir usuários",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAssignedUsers = (taskId: string) => {
    return assignments
      .filter(assignment => assignment.task_id === taskId)
      .map(assignment => assignment.profiles);
  };

  const getTasksForUser = (userId: string) => {
    return assignments
      .filter(assignment => assignment.user_id === userId)
      .map(assignment => assignment.task_id);
  };

  const removeUserFromTask = async (taskId: string, userId: string) => {
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
    }
  };

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