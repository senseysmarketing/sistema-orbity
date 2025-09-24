import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/useAuth";
import { AgencyProvider } from "@/hooks/useAgency";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Tasks from "./pages/Tasks";
import PersonalTasks from "./pages/PersonalTasks";
import Traffic from "./pages/Traffic";
import Admin from "./pages/Admin";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCanceled from "./pages/SubscriptionCanceled";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="senseys-ui-theme">
      <AuthProvider>
        <AgencyProvider>
          <SubscriptionProvider>
            <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Index />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="personal-tasks" element={<PersonalTasks />} />
                <Route path="traffic" element={<Traffic />} />
                <Route path="admin" element={<Admin />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="/subscription-success" element={<SubscriptionSuccess />} />
              <Route path="/subscription-canceled" element={<SubscriptionCanceled />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
          </SubscriptionProvider>
        </AgencyProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
