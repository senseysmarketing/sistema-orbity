import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";

export type WhatsAppConnectionStatus =
  | 'disconnected'
  | 'provisioning'
  | 'qr_pending'
  | 'connected'
  | 'error';

export interface WhatsAppConnectionState {
  status: WhatsAppConnectionStatus;
  qr_code: string | null;
  phone_number: string | null;
  error: string | null;
}

type Action = 'status' | 'connect' | 'refresh_qr' | 'disconnect' | 'hard_reset' | 'debug_health';

export function useWhatsAppConnection(purpose: 'general' | 'billing' = 'general') {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const agencyId = currentAgency?.id;
  const queryKey = ['wa-connection', agencyId, purpose] as const;

  async function invoke(action: Action): Promise<WhatsAppConnectionState> {
    if (!agencyId) throw new Error('No agency');
    const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
      body: { action, agency_id: agencyId, purpose },
    });
    if (error) throw error;
    return {
      status: (data?.status ?? 'disconnected') as WhatsAppConnectionStatus,
      qr_code: data?.qr_code ?? null,
      phone_number: data?.phone_number ?? null,
      error: data?.error ?? null,
    };
  }

  const query = useQuery({
    queryKey,
    queryFn: () => invoke('status'),
    enabled: !!agencyId,
    staleTime: 0,
    refetchInterval: (q) => {
      const s = (q.state.data as WhatsAppConnectionState | undefined)?.status;
      return s === 'provisioning' || s === 'qr_pending' ? 2000 : false;
    },
    refetchOnWindowFocus: false,
  });

  function makeMutation(action: Exclude<Action, 'status' | 'debug_health'>, successMsg?: string) {
    return {
      mutationFn: () => invoke(action),
      onSuccess: (data: WhatsAppConnectionState) => {
        queryClient.setQueryData(queryKey, data);
        if (successMsg) toast({ title: successMsg });
      },
      onError: (e: Error) => {
        toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      },
    };
  }

  const connect = useMutation(makeMutation('connect'));
  const refreshQr = useMutation(makeMutation('refresh_qr'));
  const disconnect = useMutation(makeMutation('disconnect', 'WhatsApp desconectado'));
  const hardReset = useMutation(makeMutation('hard_reset', 'Conexão resetada'));

  return {
    state: query.data ?? { status: 'disconnected' as const, qr_code: null, phone_number: null, error: null },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    connect,
    refreshQr,
    disconnect,
    hardReset,
    refetch: query.refetch,
  };
}
