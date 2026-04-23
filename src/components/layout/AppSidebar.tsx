import { NavLink, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LayoutDashboard, CheckSquare, User, Users, TrendingUp, DollarSign, BarChart3, Settings, LogOut, ChevronDown, Gauge, ContactRound, FileText, Instagram, Calendar, Upload, Trophy, MessageSquareHeart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { usePermissions, PermissionsResult } from "@/hooks/usePermissions";
import { isMasterAgencyAdmin } from "@/lib/masterAccess";
import logoNew from "@/assets/logo-new.png";
import faviconLogo from "@/assets/favicon-logo.png";

type PermKey = Extract<
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

interface MenuItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  permission?: PermKey;
  requiresAdmin?: boolean;
}

interface MenuCategory {
  label: string;
  items: MenuItem[];
}

// Categorias de menu organizadas tematicamente
const menuCategories: MenuCategory[] = [
  {
    label: "Gestão & Visão Geral",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Relatórios", url: "/dashboard/reports", icon: BarChart3, permission: "canAccessReports" },
    ],
  },
  {
    label: "Operacional",
    items: [
      { title: "Clientes", url: "/dashboard/clients", icon: Users, permission: "canAccessClients" },
      { title: "Tarefas Gerais", url: "/dashboard/tasks", icon: CheckSquare, permission: "canAccessTasks" },
      { title: "Lembretes", url: "/dashboard/reminders", icon: User, permission: "canAccessReminders" },
      { title: "Agenda", url: "/dashboard/agenda", icon: Calendar, permission: "canAccessAgenda" },
      { title: "CRM & Leads", url: "/dashboard/crm", icon: ContactRound, permission: "canAccessCRM" },
    ],
  },
  {
    label: "Marketing & Vendas",
    items: [
      { title: "Social Media", url: "/dashboard/social-media", icon: Instagram, permission: "canAccessSocialMedia" },
      { title: "Controle de Tráfego", url: "/dashboard/traffic", icon: TrendingUp, permission: "canAccessTraffic" },
      { title: "Contratos", url: "/dashboard/contracts", icon: FileText, permission: "canAccessContracts" },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "NPS", url: "/dashboard/nps", icon: MessageSquareHeart, permission: "canAccessNPS" },
      { title: "Metas & Bônus", url: "/dashboard/goals", icon: Trophy, permission: "canAccessGoals" },
      { title: "Administrativo", url: "/dashboard/admin", icon: DollarSign, permission: "canAccessFinancial" },
      { title: "Importação", url: "/dashboard/import", icon: Upload, permission: "canAccessImport" },
      { title: "Configurações", url: "/dashboard/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { currentAgency, agencyRole } = useAgency();
  const perms = usePermissions();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isMasterUser = isMasterAgencyAdmin(currentAgency?.id, agencyRole);

  // Mostra todos os itens do menu para todos os membros.
  // O bloqueio por permissão acontece dentro da página via <RequirePermission/>.
  // Apenas itens marcados como requiresAdmin continuam restritos a admins/owners.
  const canSeeItem = (item: MenuItem): boolean => {
    if (item.requiresAdmin && !perms.isAdmin) return false;
    return true;
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-white/15 text-white font-medium border-r-2 border-blue-400"
      : "hover:bg-white/10 text-white/80 hover:text-white";
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "agency_admin":
        return "Administrador";
      case "agency_user":
        return "Usuário";
      default:
        return role;
    }
  };
  const getInitials = (name: string) =>
    name.split(" ").map(word => word[0]).join("").toUpperCase().slice(0, 2);
  const getTourAttr = (url: string) => {
    if (url === "/dashboard") return "dashboard";
    if (url === "/dashboard/crm") return "crm";
    if (url === "/dashboard/tasks") return "tasks";
    if (url === "/dashboard/agenda") return "agenda";
    if (url === "/dashboard/social-media") return "social-media";
    if (url === "/dashboard/traffic") return "traffic";
    if (url === "/dashboard/admin") return "admin";
    return undefined;
  };

  return (
    <Sidebar className={`${collapsed ? "w-14" : "w-64"} bg-gradient-to-b from-purple-950 via-purple-900 to-indigo-950 border-r-0`} collapsible="icon">
      <SidebarHeader className="border-b border-white/10 p-4 bg-transparent">
        {!collapsed && (
          <div className="flex items-left justify-start">
            <img src={logoNew} alt="Logo" className="w-[122px] h-[32px] object-contain" />
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <img src={faviconLogo} alt="Logo" className="h-8 w-8 object-contain" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-transparent">
        {menuCategories.map((category) => {
          const visibleItems = category.items.filter(canSeeItem);
          // Guardrail 3: hide entire group when no items survive
          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={category.label}>
              <SidebarGroupLabel className="text-white/70">{category.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className={({ isActive }) => getNavCls({ isActive })}
                          data-tour={getTourAttr(item.url)}
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}

        {isMasterUser && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-white/70">Sistema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/dashboard/master" className={({ isActive }) => getNavCls({ isActive })}>
                      <Gauge className="h-4 w-4" />
                      {!collapsed && <span>Painel de Controle</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-4 bg-transparent">
        {!collapsed && profile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto hover:bg-white/10 text-white">
                <div className="flex items-center space-x-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback className="bg-white/15 text-white text-xs">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate text-white">{profile.name}</p>
                    <p className="text-xs text-white/70">{getRoleLabel(profile.role)}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/70" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <NavLink to="/dashboard/settings" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {collapsed && profile && (
          <div className="flex justify-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-white/15 text-white text-xs">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
