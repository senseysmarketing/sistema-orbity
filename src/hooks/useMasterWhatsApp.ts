import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type MasterWAStatus =
  | 'disconnected'
  | 'provisioning'
  | 'qr_pending'
  | 'connected'
  | 'error';

export interface MasterWAState {
  status: MasterWAStatus;
  qr_code: string | null;
  phone_number: string | null;
  error: string | null;
  provider_status?: string | null;
  connected_at?: string | null;
}

type Action = 'status' | 'connect' | 'refresh_qr' | 'disconnect' | 'hard_reset';

const QUERY_KEY = ['master-whatsapp'] as const;

async function invoke(action: Action): Promise<MasterWAState> {
  const { data, error } = await supabase.functions.invoke('master-whatsapp', {
    body: { action },
  });
  if (error) throw error;
  if (data && data.success === false) {
    throw new Error(data.error || 'Falha na ação');
  }
  return {
    status: (data?.status ?? 'disconnected') as MasterWAStatus,
    qr_code: data?.qr_code ?? null,
    phone_number: data?.phone_number ?? null,
    error: data?.error ?? null,
    provider_status: data?.provider_status ?? null,
    connected_at: data?.connected_at ?? null,
  };
}

export function useMasterWhatsApp() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => invoke('status'),
    staleTime: 0,
    refetchInterval: (q) => {
      const s = (q.state.data as MasterWAState | undefined)?.status;
      return s === 'provisioning' || s === 'qr_pending' ? 2000 : false;
    },
    refetchOnWindowFocus: false,
  });

  const makeMutation = (action: Exclude<Action, 'status'>, successMsg?: string) => ({
    mutationFn: () => invoke(action),
    onSuccess: (data: MasterWAState) => {
      qc.setQueryData(QUERY_KEY, data);
      if (successMsg) toast({ title: successMsg });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  return {
    state: query.data ?? {
      status: 'disconnected' as const,
      qr_code: null,
      phone_number: null,
      error: null,
    },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    connect: useMutation(makeMutation('connect')),
    refreshQr: useMutation(makeMutation('refresh_qr')),
    disconnect: useMutation(makeMutation('disconnect', 'WhatsApp desconectado')),
    hardReset: useMutation(makeMutation('hard_reset', 'Conexão resetada')),
  };
}
