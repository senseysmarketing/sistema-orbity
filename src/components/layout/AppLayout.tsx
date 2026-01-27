import { Outlet, Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';
import { Button } from "@/components/ui/button";
import { Loader2, Moon, Sun } from 'lucide-react';
import { useTheme } from "@/components/ui/theme-provider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { HelpButton } from "@/components/help/HelpButton";
import { TourTooltip } from "@/components/tour/TourTooltip";
import { NoAgencyScreen } from "@/components/agency/NoAgencyScreen";

export function AppLayout() {
  const { user, loading: authLoading } = useAuth();
  const { loading: agencyLoading, hasNoAgency, userAgencies } = useAgency();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Show loading while checking auth or agency
  if (authLoading || agencyLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Authenticated but has no agency -> show blocked screen
  if (hasNoAgency || userAgencies.length === 0) {
    return <NoAgencyScreen />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with sidebar trigger and theme toggle */}
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/50 backdrop-blur-sm flex-shrink-0 z-40">
            <SidebarTrigger className="h-8 w-8" />
            
            <div className="flex items-center gap-2">
              <NotificationBell />
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Alternar tema</span>
              </Button>
            </div>
          </header>
          
          {/* Main content */}
          <main className="flex-1 p-4 md:p-6 overflow-auto pb-20 md:pb-6">
            <Outlet />
          </main>
          
          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />
        </div>
      </div>
      
      {/* Global components */}
      <HelpButton />
      <TourTooltip />
    </SidebarProvider>
  );
}
