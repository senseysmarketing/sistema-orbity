import { NavLink, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LayoutDashboard, CheckSquare, User, Users, TrendingUp, DollarSign, BarChart3, Settings, LogOut, ChevronDown, Gauge, ContactRound, FileText, Instagram, Calendar, Upload, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { isMasterAgencyAdmin } from "@/lib/masterAccess";
import logoNew from "@/assets/logo-new.png";
import faviconLogo from "@/assets/favicon-logo.png";

// Categorias de menu organizadas tematicamente
const menuCategories = [
  {
    label: "Gestão & Visão Geral",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Relatórios",
        url: "/dashboard/reports",
        icon: BarChart3,
      }
    ]
  },
  {
    label: "Operacional",
    items: [
      {
        title: "Clientes",
        url: "/dashboard/clients",
        icon: Users,
      },
      {
        title: "Tarefas Gerais",
        url: "/dashboard/tasks",
        icon: CheckSquare,
      },
      {
        title: "Lembretes",
        url: "/dashboard/reminders",
        icon: User,
      },
      {
        title: "Agenda",
        url: "/dashboard/agenda",
        icon: Calendar,
      },
      {
        title: "CRM & Leads",
        url: "/dashboard/crm",
        icon: ContactRound,
      }
    ]
  },
  {
    label: "Marketing & Vendas",
    items: [
      {
        title: "Social Media",
        url: "/dashboard/social-media",
        icon: Instagram,
      },
      {
        title: "Controle de Tráfego",
        url: "/dashboard/traffic",
        icon: TrendingUp,
      },
      {
        title: "Contratos",
        url: "/dashboard/contracts",
        icon: FileText,
      }
    ]
  },
  {
    label: "Administração",
    items: [
      {
        title: "Metas & Bônus",
        url: "/dashboard/goals",
        icon: Trophy,
      },
      {
        title: "Administrativo",
        url: "/dashboard/admin",
        icon: DollarSign,
        requiresAdmin: true
      },
      {
        title: "Importação",
        url: "/dashboard/import",
        icon: Upload,
        requiresAdmin: true
      },
      {
        title: "Configurações",
        url: "/dashboard/settings",
        icon: Settings,
        requiresAdmin: true
      }
    ]
  }
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { profile, signOut } = useAuth();
  const { currentAgency, agencyRole } = useAgency();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  
  // Verificar se é admin da agência master (Senseys)
  const isMasterUser = isMasterAgencyAdmin(currentAgency?.id, agencyRole);
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/dashboard";
    }
    return currentPath.startsWith(path);
  };
  const getNavCls = ({
    isActive
  }: {
    isActive: boolean;
  }) => isActive ? "bg-sidebar-accent text-sidebar-foreground font-medium border-r-2 border-blue-400" : "hover:bg-sidebar-muted text-sidebar-foreground/80 hover:text-sidebar-foreground";
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'agency_admin':
        return 'Administrador';
      case 'agency_user':
        return 'Usuário';
      default:
        return role;
    }
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };
  const getTourAttr = (url: string) => {
    if (url === '/dashboard') return 'dashboard';
    if (url === '/dashboard/crm') return 'crm';
    if (url === '/dashboard/tasks') return 'tasks';
    if (url === '/dashboard/agenda') return 'agenda';
    if (url === '/dashboard/social-media') return 'social-media';
    if (url === '/dashboard/traffic') return 'traffic';
    if (url === '/dashboard/admin') return 'admin';
    return undefined;
  };

  return <Sidebar className={`${collapsed ? "w-14" : "w-64"} bg-sidebar border-r-0`} collapsible="icon">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-4 bg-sidebar">
        {!collapsed && <div className="flex items-left justify-start">
            <img src={logoNew} alt="Logo" className="w-[122px] h-[32px] object-contain" />
          </div>}
        {collapsed && <div className="flex justify-center">
            <img src={faviconLogo} alt="Logo" className="h-8 w-8 object-contain" />
          </div>}
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        {menuCategories.map((category) => (
          <SidebarGroup key={category.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/70">
              {category.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {category.items.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end={item.url === "/dashboard"} 
                        className={({isActive}) => getNavCls({isActive})}
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
        ))}

        {/* Painel de Controle - Only for Senseys agency admins */}
        {isMasterUser && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70">Sistema</SidebarGroupLabel>
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

      {/* Footer with user info */}
      <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar">
        {!collapsed && profile && <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto hover:bg-sidebar-muted text-sidebar-foreground">
                <div className="flex items-center space-x-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate text-sidebar-foreground">{profile.name}</p>
                    <p className="text-xs text-sidebar-foreground/70">
                      {getRoleLabel(profile.role)}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/70" />
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
          </DropdownMenu>}
        {collapsed && profile && <div className="flex justify-center">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
          </div>}
      </SidebarFooter>
    </Sidebar>;
}
