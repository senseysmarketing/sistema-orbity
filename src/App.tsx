import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProductTourProvider } from "@/hooks/useProductTour";
import { AgencyProvider } from "@/hooks/useAgency";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { MasterProvider } from "@/hooks/useMaster";
import { PaymentMiddlewareProvider } from "@/hooks/usePaymentMiddleware";
import { PaymentMiddlewareWrapper } from "@/components/payment/PaymentMiddlewareWrapper";
import { AppLayout } from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Welcome from "./pages/Welcome";
import Tasks from "./pages/Tasks";
import Reminders from "./pages/Reminders";
import CRM from "./pages/CRM";
import Agenda from "./pages/Agenda";
import Traffic from "./pages/Traffic";
import Admin from "./pages/Admin";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Master from "./pages/Master";
import Onboarding from "./pages/Onboarding";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import SubscriptionCanceled from "./pages/SubscriptionCanceled";
import Contracts from "./pages/Contracts";
import SocialMedia from "./pages/SocialMedia";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="senseys-ui-theme">
      <AuthProvider>
        <ProductTourProvider>
          <AgencyProvider>
            <SubscriptionProvider>
              <MasterProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter future={{ 
                    v7_startTransition: true,
                    v7_relativeSplatPath: true 
                  }}>
                    <PaymentMiddlewareProvider>
                    <Routes>
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/welcome" element={<Welcome />} />
                      <Route path="/" element={
                        <PaymentMiddlewareWrapper>
                          <AppLayout />
                        </PaymentMiddlewareWrapper>
                      }>
                        <Route index element={<Index />} />
                        <Route path="tasks" element={<Tasks />} />
                        <Route path="reminders" element={<Reminders />} />
                        <Route path="crm" element={<CRM />} />
                        <Route path="agenda" element={<Agenda />} />
                        <Route path="traffic" element={<Traffic />} />
                        <Route path="admin" element={<Admin />} />
                        <Route path="contracts" element={<Contracts />} />
                        <Route path="social-media" element={<SocialMedia />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="master" element={<Master />} />
                      </Route>
                      <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                      <Route path="/subscription-canceled" element={<SubscriptionCanceled />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    </PaymentMiddlewareProvider>
                  </BrowserRouter>
                </TooltipProvider>
              </MasterProvider>
            </SubscriptionProvider>
          </AgencyProvider>
        </ProductTourProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
