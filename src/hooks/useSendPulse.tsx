import { useQuery, useQueryClient, useIsFetching } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";

const STALE_TIME = 1000 * 60 * 5; // 5 min
const GC_TIME = 1000 * 60 * 30; // 30 min

async function invokeSendPulse(action: string, extra: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke("sendpulse-api", {
    body: { action, ...extra },
  });
  if (error) throw error;
  return data;
}

export const sendpulseKeys = {
  all: (agencyId?: string) => ["sendpulse", agencyId] as const,
  integration: (agencyId?: string) => ["sendpulse", agencyId, "integration"] as const,
  accountInfo: (agencyId?: string) => ["sendpulse", agencyId, "account-info"] as const,
  addressBooks: (agencyId?: string) => ["sendpulse", agencyId, "addressbooks"] as const,
  campaigns: (agencyId?: string) => ["sendpulse", agencyId, "campaigns"] as const,
  senders: (agencyId?: string) => ["sendpulse", agencyId, "senders"] as const,
  
};

const baseOpts = {
  staleTime: STALE_TIME,
  gcTime: GC_TIME,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
};

export function useSendPulseIntegration() {
  const { currentAgency } = useAgency();
  const agencyId = currentAgency?.id;

  return useQuery({
    queryKey: sendpulseKeys.integration(agencyId),
    queryFn: async () => {
      if (!agencyId) return null;
      const { data, error } = await supabase
        .from("agency_integrations")
        .select("sendpulse_client_id, sendpulse_client_secret")
        .eq("agency_id", agencyId)
        .maybeSingle();
      if (error) throw error;
      const configured = !!(data?.sendpulse_client_id && data?.sendpulse_client_secret);
      return { configured, hasClientId: !!data?.sendpulse_client_id };
    },
    enabled: !!agencyId,
    ...baseOpts,
  });
}

export function useSendPulseAccountInfo(enabled = true) {
  const { currentAgency } = useAgency();
  const agencyId = currentAgency?.id;
  return useQuery({
    queryKey: sendpulseKeys.accountInfo(agencyId),
    queryFn: () => invokeSendPulse("get_account_info"),
    enabled: !!agencyId && enabled,
    ...baseOpts,
  });
}

export function useSendPulseAddressBooks(enabled = true) {
  const { currentAgency } = useAgency();
  const agencyId = currentAgency?.id;
  return useQuery<any[]>({
    queryKey: sendpulseKeys.addressBooks(agencyId),
    queryFn: async () => {
      const r = await invokeSendPulse("get_addressbooks");
      return Array.isArray(r) ? r : [];
    },
    enabled: !!agencyId && enabled,
    ...baseOpts,
  });
}

export function useSendPulseCampaigns(enabled = true) {
  const { currentAgency } = useAgency();
  const agencyId = currentAgency?.id;
  return useQuery<any[]>({
    queryKey: sendpulseKeys.campaigns(agencyId),
    queryFn: async () => {
      const r = await invokeSendPulse("get_campaigns");
      return Array.isArray(r) ? r : [];
    },
    enabled: !!agencyId && enabled,
    ...baseOpts,
  });
}

export function useSendPulseSenders(enabled = true) {
  const { currentAgency } = useAgency();
  const agencyId = currentAgency?.id;
  return useQuery<any[]>({
    queryKey: sendpulseKeys.senders(agencyId),
    queryFn: async () => {
      const r = await invokeSendPulse("get_senders");
      return Array.isArray(r) ? r : [];
    },
    enabled: !!agencyId && enabled,
    ...baseOpts,
  });
}


export function useSendPulseInvalidate() {
  const { currentAgency } = useAgency();
  const agencyId = currentAgency?.id;
  const queryClient = useQueryClient();

  return {
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: sendpulseKeys.all(agencyId) }),
    invalidateAccountInfo: () =>
      queryClient.invalidateQueries({ queryKey: sendpulseKeys.accountInfo(agencyId) }),
    invalidateAddressBooks: () =>
      queryClient.invalidateQueries({ queryKey: sendpulseKeys.addressBooks(agencyId) }),
    invalidateCampaigns: () =>
      queryClient.invalidateQueries({ queryKey: sendpulseKeys.campaigns(agencyId) }),
    invalidateSenders: () =>
      queryClient.invalidateQueries({ queryKey: sendpulseKeys.senders(agencyId) }),
  };
}

export function useSendPulseIsFetching() {
  const { currentAgency } = useAgency();
  const agencyId = currentAgency?.id;
  return useIsFetching({ queryKey: sendpulseKeys.all(agencyId) }) > 0;
}
