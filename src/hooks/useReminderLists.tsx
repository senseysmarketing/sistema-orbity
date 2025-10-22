import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReminderList {
  id: string;
  user_id: string;
  agency_id: string | null;
  name: string;
  color: string;
  icon: string;
  order_position: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useReminderLists() {
  const [lists, setLists] = useState<ReminderList[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchLists = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reminder_lists')
        .select('*')
        .order('order_position', { ascending: true });

      if (error) throw error;
      setLists(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar listas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();

    const channel = supabase
      .channel('reminder_lists_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminder_lists'
        },
        () => fetchLists()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createList = async (list: Partial<ReminderList>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('reminder_lists')
        .insert([{
          name: list.name!,
          color: list.color || 'bg-blue-500',
          icon: list.icon || '📋',
          order_position: list.order_position || 0,
          is_default: list.is_default || false,
          user_id: user.id,
        }]);

      if (error) throw error;

      toast({
        title: "Lista criada",
        description: "Nova lista criada com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar lista",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateList = async (id: string, updates: Partial<ReminderList>) => {
    try {
      const { error } = await supabase
        .from('reminder_lists')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Lista atualizada",
        description: "Lista atualizada com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar lista",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteList = async (id: string) => {
    try {
      const { error } = await supabase
        .from('reminder_lists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Lista removida",
        description: "Lista removida com sucesso!",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover lista",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    lists,
    loading,
    createList,
    updateList,
    deleteList,
    refetch: fetchLists,
  };
}
