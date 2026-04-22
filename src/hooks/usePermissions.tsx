import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useAgency } from "./useAgency";
import { AppPermissions, DEFAULT_PERMISSIONS } from "@/lib/rolePresets";

export interface PermissionsResult {
  loading: boolean;
  permissions: AppPermissions;
  customRole: string | null;
  canAccessCRM: boolean;
  canAccessTasks: boolean;
  canAccessFinancial: boolean;
  canAccessTraffic: boolean;
  canAccessSocialMedia: boolean;
  canAccessAgenda: boolean;
  isAdmin: boolean;
}

const ALL_TRUE: AppPermissions = {
  crm: true,
  tasks: true,
  financial: true,
  traffic: true,
  social_media: true,
  agenda: true,
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
      canAccessCRM: true,
      canAccessTasks: true,
      canAccessFinancial: true,
      canAccessTraffic: true,
      canAccessSocialMedia: true,
      canAccessAgenda: true,
      isAdmin: true,
    };
  }

  // Guardrail 2: null-safe fallback
  const rawPerms = data?.app_permissions as unknown;
  const perms: AppPermissions =
    rawPerms && typeof rawPerms === "object" && !Array.isArray(rawPerms)
      ? { ...DEFAULT_PERMISSIONS, ...(rawPerms as Partial<AppPermissions>) }
      : DEFAULT_PERMISSIONS;

  return {
    loading: enabled && isLoading,
    permissions: perms,
    customRole: data?.custom_role ?? null,
    canAccessCRM: !!perms.crm,
    canAccessTasks: !!perms.tasks,
    canAccessFinancial: !!perms.financial,
    canAccessTraffic: !!perms.traffic,
    canAccessSocialMedia: !!perms.social_media,
    canAccessAgenda: !!perms.agenda,
    isAdmin: false,
  };
}
