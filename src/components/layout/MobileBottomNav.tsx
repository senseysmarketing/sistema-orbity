import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, CheckSquare, Target, Calendar, Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { usePermissions, PermissionsResult } from "@/hooks/usePermissions";

type PermKey = Extract<
  keyof PermissionsResult,
  "canAccessCRM" | "canAccessTasks" | "canAccessAgenda"
>;

const navItems: Array<{
  icon: typeof LayoutDashboard;
  label: string;
  path: string;
  permission?: PermKey;
}> = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: CheckSquare, label: "Tarefas", path: "/dashboard/tasks", permission: "canAccessTasks" },
  { icon: Target, label: "CRM", path: "/dashboard/crm", permission: "canAccessCRM" },
  { icon: Calendar, label: "Agenda", path: "/dashboard/agenda", permission: "canAccessAgenda" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleSidebar } = useSidebar();
  const perms = usePermissions();

  const visibleItems = navItems.filter(item => !item.permission || perms[item.permission]);

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === "/dashboard";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t pwa-safe-bottom">
      <div className="flex items-center justify-around h-16">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        
        {/* Menu button to open sidebar */}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </div>
    </nav>
  );
}
