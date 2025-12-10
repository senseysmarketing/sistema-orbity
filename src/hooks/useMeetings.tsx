import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useAgency } from "./useAgency";
import { toast } from "@/hooks/use-toast";

export interface Meeting {
  id: string;
  agency_id: string;
  title: string;
  description?: string;
  meeting_type: 'commercial' | 'client' | 'internal' | 'quick_call' | 'workshop' | 'results';
  start_time: string;
  end_time: string;
  location?: string;
  google_meet_link?: string;
  google_calendar_event_id?: string;
  organizer_id: string;
  participants?: string[];
  external_participants?: Array<{ name: string; email: string; company?: string }>;
  client_id?: string;
  lead_id?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  meeting_notes?: string;
  action_items?: Array<{ text: string; responsible?: string; completed: boolean }>;
  outcome?: 'win' | 'loss' | 'follow_up_needed' | 'pending';
  next_steps?: string;
  follow_up_date?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  cancelled_reason?: string;
  sync_to_google_calendar?: boolean;
  organizer?: { name: string; email: string };
  client?: { name: string };
  lead?: { name: string };
}

export const useMeetings = () => {
  const { user } = useAuth();
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];

      const { data, error } = await supabase
        .from("meetings")
        .select(`
          *,
          organizer:profiles!meetings_organizer_id_fkey(name, email),
          client:clients(name),
          lead:leads(name)
        `)
        .eq("agency_id", currentAgency.id)
        .order("start_time", { ascending: true });

      if (error) throw error;
      
      // Cast the data properly, handling JSONB types
      return (data || []).map(m => ({
        ...m,
        external_participants: m.external_participants as Meeting['external_participants'],
        action_items: m.action_items as Meeting['action_items'],
        participants: m.participants as string[],
      })) as Meeting[];
    },
    enabled: !!currentAgency?.id,
  });

  const createMeeting = useMutation({
    mutationFn: async (meeting: Partial<Meeting>) => {
      if (!currentAgency?.id || !user?.id) throw new Error("Missing required data");

      const { data, error } = await supabase
        .from("meetings")
        .insert([{
          title: meeting.title,
          description: meeting.description,
          meeting_type: meeting.meeting_type,
          start_time: meeting.start_time,
          end_time: meeting.end_time,
          location: meeting.location,
          google_meet_link: meeting.google_meet_link,
          participants: meeting.participants,
          external_participants: meeting.external_participants,
          client_id: meeting.client_id,
          lead_id: meeting.lead_id,
          sync_to_google_calendar: meeting.sync_to_google_calendar ?? false,
          agency_id: currentAgency.id,
          organizer_id: user.id,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data as Meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({
        title: "Reunião criada",
        description: "A reunião foi criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar reunião",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMeeting = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Meeting> & { id: string }) => {
      const { data, error } = await supabase
        .from("meetings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({
        title: "Reunião atualizada",
        description: "A reunião foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar reunião",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast({
        title: "Reunião excluída",
        description: "A reunião foi excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir reunião",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    meetings,
    isLoading,
    createMeeting,
    updateMeeting,
    deleteMeeting,
  };
};
