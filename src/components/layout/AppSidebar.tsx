import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LayoutDashboard, CheckSquare, User, Users, TrendingUp, DollarSign, BarChart3, Settings, LogOut, ChevronDown, Shield, ContactRound, FileText, Instagram, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoNew from "@/assets/logo-new.png";

const menuItems = [{
  title: "Dashboard",
  url: "/",
  icon: LayoutDashboard,
  roles: ["agency_admin", "agency_user"]
}, {
  title: "Tarefas Gerais",
  url: "/tasks",
  icon: CheckSquare,
  roles: ["agency_admin", "agency_user"]
}, {
  title: "Lembretes",
  url: "/reminders",
  icon: User,
  roles: ["agency_admin", "agency_user"]
}, {
  title: "CRM & Leads",
  url: "/crm",
  icon: ContactRound,
  roles: ["agency_admin", "agency_user"]
}, {
  title: "Agenda",
  url: "/agenda",
  icon: Calendar,
  roles: ["agency_admin", "agency_user"]
}, {
  title: "Controle de Tráfego",
  url: "/traffic",
  icon: TrendingUp,
  roles: ["agency_admin", "agency_user"]
}, {
  title: "Administrativo",
  url: "/admin",
  icon: DollarSign,
  roles: ["agency_admin"]
}, {
  title: "Contratos",
  url: "/contracts",
  icon: FileText,
  roles: ["agency_admin", "agency_user"]
}, {
  title: "Social Media",
  url: "/social-media",
  icon: Instagram,
  roles: ["agency_admin", "agency_user"]
}, {
  title: "Relatórios",
  url: "/reports",
  icon: BarChart3,
  roles: ["agency_admin", "agency_user"]
}, {
  title: "Configurações",
  url: "/settings",
  icon: Settings,
  roles: ["agency_admin"]
}];

export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const location = useLocation();
  const {
    profile,
    signOut
  } = useAuth();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/";
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
      case 'super_admin':
        return 'Super Admin';
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
  const filteredMenuItems = menuItems.filter(item => !profile?.role || item.roles.includes(profile.role));
  return <Sidebar className={`${collapsed ? "w-14" : "w-64"} bg-sidebar border-r-0`} collapsible="icon">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border p-4 bg-sidebar">
        {!collapsed && <div className="flex items-left justify-start">
            <img src={logoNew} alt="Logo" className="w-[122px] h-[32px] object-contain" />
          </div>}
        {collapsed && <div className="flex justify-center">
            <img src={logoNew} alt="Logo" className="h-6 w-6" />
          </div>}
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className={({
                  isActive
                }) => getNavCls({
                  isActive
                })}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Master Section - Only for super admin */}
        {profile?.role === 'super_admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70">Master</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/master" className={({ isActive }) => getNavCls({ isActive })}>
                      <Shield className="h-4 w-4" />
                      {!collapsed && <span>Dashboard Master</span>}
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
                <NavLink to="/settings" className="w-full">
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
