import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';
import { toast } from 'sonner';

export interface SocialMediaTask {
  id: string;
  title: string;
  description?: string | null;
  client_id: string | null;
  client_name?: string | null;
  scheduled_date: string; // post_date || due_date || created_at
  post_date?: string | null;
  due_date?: string | null;
  post_type: string;
  platform: string;
  status: string;
  priority: string;
  hashtags: string[] | null;
  creative_instructions?: string | null;
  archived: boolean;
  created_at: string;
  created_by: string;
  agency_id: string;
  // Mapped fields for compatibility
  clients?: { name: string } | null;
  assigned_users?: {
    id: string;
    user_id: string;
    name: string;
    role: string;
  }[];
  // Keep for analytics compatibility
  post_assignments?: { user_id: string }[];
}

/** Map task status to social media vocabulary */
export function mapTaskStatusToSocial(status: string): string {
  const mapping: Record<string, string> = {
    todo: 'draft',
    pending: 'draft',
    in_progress: 'in_creation',
    review: 'pending_approval',
    revision: 'pending_approval',
    completed: 'published',
    done: 'published',
  };
  return mapping[status] || status;
}

export function useSocialMediaTasks() {
  const { currentAgency } = useAgency();
  const [tasks, setTasks] = useState<SocialMediaTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!currentAgency?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch tasks with task_type = 'redes_sociais'
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id, title, description, status, priority,
          due_date, created_at, created_by, agency_id, archived,
          metadata,
          task_clients(client_id, clients(name)),
          task_assignments(user_id)
        `)
        .eq('agency_id', currentAgency.id)
        .eq('task_type', 'redes_sociais')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (tasksError) throw tasksError;

      // Get unique user IDs for profile lookup
      const userIds = new Set<string>();
      (tasksData || []).forEach((t: any) => {
        t.task_assignments?.forEach((a: any) => userIds.add(a.user_id));
      });

      let profilesMap: Record<string, { name: string; role: string }> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, role')
          .in('user_id', Array.from(userIds));
        (profiles || []).forEach((p: any) => {
          profilesMap[p.user_id] = { name: p.name, role: p.role };
        });
      }

      // Map tasks to SocialMediaTask interface
      const mapped: SocialMediaTask[] = (tasksData || []).map((task: any) => {
        const meta = task.metadata || {};
        const postDate = meta.post_date || null;
        const platform = meta.platform || '';
        const postType = meta.post_type || '';
        const hashtags = meta.hashtags || null;
        const creativeInstructions = meta.creative_instructions || null;

        // Get first client (for grouping compatibility)
        const firstClient = task.task_clients?.[0];
        const clientId = firstClient?.client_id || null;
        const clientName = firstClient?.clients?.name || null;

        // Determine scheduled_date: post_date > due_date > created_at
        const scheduledDate = postDate || task.due_date || task.created_at;

        // Map status
        const mappedStatus = mapTaskStatusToSocial(task.status);

        // Build assigned users
        const assignedUsers = (task.task_assignments || []).map((a: any) => {
          const profile = profilesMap[a.user_id];
          return {
            id: a.user_id,
            user_id: a.user_id,
            name: profile?.name || 'Usuário',
            role: profile?.role || '',
          };
        });

        return {
          id: task.id,
          title: task.title || '',
          description: task.description,
          client_id: clientId,
          client_name: clientName,
          scheduled_date: scheduledDate,
          post_date: postDate,
          due_date: task.due_date,
          post_type: postType,
          platform: platform,
          status: mappedStatus,
          priority: task.priority || 'medium',
          hashtags,
          creative_instructions: creativeInstructions,
          archived: task.archived || false,
          created_at: task.created_at,
          created_by: task.created_by,
          agency_id: task.agency_id,
          clients: clientName ? { name: clientName } : null,
          assigned_users: assignedUsers,
          post_assignments: (task.task_assignments || []).map((a: any) => ({ user_id: a.user_id })),
        };
      });

      setTasks(mapped);
    } catch (error: any) {
      toast.error('Erro ao carregar tarefas de social media: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [currentAgency?.id]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const allTasks = tasks;
  const activeTasks = useMemo(() => tasks.filter(t => !t.archived), [tasks]);

  return {
    tasks: activeTasks,
    allTasks,
    loading,
    fetchTasks,
  };
}
