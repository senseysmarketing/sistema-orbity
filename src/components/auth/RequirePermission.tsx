import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { usePermissions, PermissionsResult } from "@/hooks/usePermissions";

type PermissionKey = Extract<
  keyof PermissionsResult,
  | "canAccessClients"
  | "canAccessTasks"
  | "canAccessReminders"
  | "canAccessAgenda"
  | "canAccessCRM"
  | "canAccessSocialMedia"
  | "canAccessTraffic"
  | "canAccessContracts"
  | "canAccessNPS"
  | "canAccessGoals"
  | "canAccessFinancial"
  | "canAccessReports"
  | "canAccessImport"
>;

interface RequirePermissionProps {
  permission?: PermissionKey;
  requireAdmin?: boolean;
  children: ReactNode;
}

export function RequirePermission({ permission, requireAdmin, children }: RequirePermissionProps) {
  const perms = usePermissions();

  if (perms.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const allowed = requireAdmin ? perms.isAdmin : permission ? perms[permission] : true;

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center text-center py-12 px-6 space-y-4">
            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Acesso Restrito</h2>
              <p className="text-sm text-muted-foreground">
                Você não tem permissão para acessar este módulo. Fale com o administrador da agência.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
