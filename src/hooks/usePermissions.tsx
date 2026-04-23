import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useAgency } from "./useAgency";
import { AppPermissions, DEFAULT_PERMISSIONS } from "@/lib/rolePresets";

export interface PermissionsResult {
  loading: boolean;
  permissions: AppPermissions;
  customRole: string | null;
  canAccessClients: boolean;
  canAccessTasks: boolean;
  canAccessReminders: boolean;
  canAccessAgenda: boolean;
  canAccessCRM: boolean;
  canAccessSocialMedia: boolean;
  canAccessTraffic: boolean;
  canAccessContracts: boolean;
  canAccessNPS: boolean;
  canAccessGoals: boolean;
  canAccessFinancial: boolean;
  canAccessReports: boolean;
  canAccessImport: boolean;
  isAdmin: boolean;
}

const ALL_TRUE: AppPermissions = {
  clients: true, tasks: true, reminders: true, agenda: true, crm: true,
  social_media: true, traffic: true, contracts: true,
  nps: true, goals: true, financial: true, reports: true, import_data: true,
};

export function usePermissions(): PermissionsResult {
  const { user, profile } = useAuth();
  const { currentAgency, agencyRole } = useAgency();

  const isAdmin =
    agencyRole === "owner" ||
    agencyRole === "admin" ||
    (profile?.role as string) === "super_admin" ||
    (profile?.role as string) === "administrador" ||
    profile?.role === "agency_admin";

  const enabled = !!user?.id && !!currentAgency?.id && !isAdmin;

  const { data, isLoading } = useQuery({
    queryKey: ["app-permissions", user?.id, currentAgency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_users")
        .select("app_permissions, custom_role")
        .eq("user_id", user!.id)
        .eq("agency_id", currentAgency!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  if (isAdmin) {
    return {
      loading: false,
      permissions: ALL_TRUE,
      customRole: null,
      canAccessClients: true,
      canAccessTasks: true,
      canAccessReminders: true,
      canAccessAgenda: true,
      canAccessCRM: true,
      canAccessSocialMedia: true,
      canAccessTraffic: true,
      canAccessContracts: true,
      canAccessNPS: true,
      canAccessGoals: true,
      canAccessFinancial: true,
      canAccessReports: true,
      canAccessImport: true,
      isAdmin: true,
    };
  }

  // Fallback retrocompatível: herdar das chaves antigas quando as novas não existem
  const rawObj =
    data?.app_permissions && typeof data.app_permissions === "object" && !Array.isArray(data.app_permissions)
      ? (data.app_permissions as Record<string, boolean | undefined>)
      : {};
  const raw = rawObj as Partial<AppPermissions>;

  const perms: AppPermissions = {
    clients:      raw.clients      ?? raw.crm ?? DEFAULT_PERMISSIONS.clients,
    tasks:        raw.tasks        ?? DEFAULT_PERMISSIONS.tasks,
    reminders:    raw.reminders    ?? DEFAULT_PERMISSIONS.reminders,
    agenda:       raw.agenda       ?? DEFAULT_PERMISSIONS.agenda,
    crm:          raw.crm          ?? DEFAULT_PERMISSIONS.crm,
    social_media: raw.social_media ?? DEFAULT_PERMISSIONS.social_media,
    traffic:      raw.traffic      ?? DEFAULT_PERMISSIONS.traffic,
    contracts:    raw.contracts    ?? raw.financial ?? DEFAULT_PERMISSIONS.contracts,
    nps:          raw.nps          ?? raw.crm ?? DEFAULT_PERMISSIONS.nps,
    goals:        raw.goals        ?? raw.financial ?? DEFAULT_PERMISSIONS.goals,
    financial:    raw.financial    ?? DEFAULT_PERMISSIONS.financial,
    reports:      raw.reports      ?? DEFAULT_PERMISSIONS.reports,
    import_data:  raw.import_data  ?? DEFAULT_PERMISSIONS.import_data,
  };

  return {
    loading: enabled && isLoading,
    permissions: perms,
    customRole: data?.custom_role ?? null,
    canAccessClients: !!perms.clients,
    canAccessTasks: !!perms.tasks,
    canAccessReminders: !!perms.reminders,
    canAccessAgenda: !!perms.agenda,
    canAccessCRM: !!perms.crm,
    canAccessSocialMedia: !!perms.social_media,
    canAccessTraffic: !!perms.traffic,
    canAccessContracts: !!perms.contracts,
    canAccessNPS: !!perms.nps,
    canAccessGoals: !!perms.goals,
    canAccessFinancial: !!perms.financial,
    canAccessReports: !!perms.reports,
    canAccessImport: !!perms.import_data,
    isAdmin: false,
  };
}
