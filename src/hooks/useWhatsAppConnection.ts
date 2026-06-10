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

export type WhatsAppConnectionMode = 'managed' | 'external';

export interface WhatsAppConnectionState {
  status: WhatsAppConnectionStatus;
  qr_code: string | null;
  phone_number: string | null;
  error: string | null;
  connection_mode: WhatsAppConnectionMode;
  webhook_managed_by_orbity: boolean;
  instance_name: string | null;
  api_url: string | null;
  api_key_masked: string | null;
}

type Action =
  | 'status'
  | 'connect'
  | 'refresh_qr'
  | 'disconnect'
  | 'hard_reset'
  | 'debug_health'
  | 'validate_external_instance'
  | 'manual_attach'
  | 'manual_detach';

export interface ExternalInstancePayload {
  api_url: string;
  api_key: string;
  instance_name?: string;
  configure_webhook?: boolean;
}

const DEFAULT_STATE: WhatsAppConnectionState = {
  status: 'disconnected',
  qr_code: null,
  phone_number: null,
  error: null,
  connection_mode: 'managed',
  webhook_managed_by_orbity: false,
  instance_name: null,
  api_url: null,
  api_key_masked: null,
};

export function useWhatsAppConnection(purpose: 'general' | 'billing' = 'general') {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const agencyId = currentAgency?.id;
  const queryKey = ['wa-connection', agencyId, purpose] as const;

  async function invoke(
    action: Action,
    payload: Record<string, unknown> = {},
  ): Promise<WhatsAppConnectionState & { [k: string]: any }> {
    if (!agencyId) throw new Error('No agency');
    const { data, error } = await supabase.functions.invoke('whatsapp-connect', {
      body: { action, agency_id: agencyId, purpose, ...payload },
    });
    if (error) throw error;
    if (data?.success === false && data?.error) {
      throw new Error(data.error);
    }
    return {
      status: (data?.status ?? 'disconnected') as WhatsAppConnectionStatus,
      qr_code: data?.qr_code ?? null,
      phone_number: data?.phone_number ?? null,
      error: data?.error ?? null,
      connection_mode: (data?.connection_mode ?? 'managed') as WhatsAppConnectionMode,
      webhook_managed_by_orbity: !!data?.webhook_managed_by_orbity,
      instance_name: data?.instance_name ?? null,
      api_url: data?.api_url ?? null,
      api_key_masked: data?.api_key_masked ?? null,
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
      mutationFn: (payload?: Record<string, unknown>) => invoke(action, payload ?? {}),
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

  const validateExternal = useMutation({
    mutationFn: (payload: ExternalInstancePayload) =>
      invoke('validate_external_instance', payload as unknown as Record<string, unknown>),
    onError: (e: Error) => {
      toast({ title: 'Não foi possível validar', description: e.message, variant: 'destructive' });
    },
  });

  const manualAttach = useMutation({
    mutationFn: (payload: ExternalInstancePayload) =>
      invoke('manual_attach', payload as unknown as Record<string, unknown>),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      toast({ title: 'Instância vinculada à Orbity' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro ao vincular', description: e.message, variant: 'destructive' });
    },
  });

  const manualDetach = useMutation({
    mutationFn: () => invoke('manual_detach'),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      toast({ title: 'Vínculo removido' });
    },
    onError: (e: Error) => {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    },
  });

  return {
    state: query.data ?? DEFAULT_STATE,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    connect,
    refreshQr,
    disconnect,
    hardReset,
    validateExternal,
    manualAttach,
    manualDetach,
    refetch: query.refetch,
  };
}
