import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useTaskAssignments() {
  const { toast } = useToast();

  const assignUsersToTask = async (taskId: string, userIds: string[]): Promise<boolean> => {
    try {
      await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId);

      if (userIds.length > 0) {
        const { error } = await supabase
          .from('task_assignments')
          .insert(userIds.map(userId => ({ task_id: taskId, user_id: userId })));

        if (error) throw error;
      }

      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao atribuir usuários",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const removeUserFromTask = async (taskId: string, userId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('task_assignments')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    assignUsersToTask,
    removeUserFromTask,
  };
}
