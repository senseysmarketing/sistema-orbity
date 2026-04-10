import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProductTourProvider } from "@/hooks/useProductTour";
import { AgencyProvider } from "@/hooks/useAgency";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { MasterProvider } from "@/hooks/useMaster";
import { PaymentMiddlewareProvider } from "@/hooks/usePaymentMiddleware";
import { PaymentMiddlewareWrapper } from "@/components/payment/PaymentMiddlewareWrapper";
import { AppLayout } from "@/components/layout/AppLayout";
import { initMetaPixel, trackPageView } from "@/lib/metaPixel";
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
import LandingPage from "./pages/LandingPage";
import Import from "./pages/Import";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Install from "./pages/Install";
import NotificationSettings from "./pages/NotificationSettings";
import Goals from "./pages/Goals";
import RegisterByInvite from "./pages/RegisterByInvite";
import PublicClientReport from "./pages/PublicClientReport";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

// Componente para rastrear PageViews em navegação SPA
function PageViewTracker() {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);
  
  return null;
}

// Inicializar Meta Pixel
initMetaPixel();

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
                      <PageViewTracker />
                      <Routes>
                        {/* Landing Page como página principal */}
                        <Route path="/" element={<LandingPage />} />
                        
                        {/* Páginas públicas */}
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/install" element={<Install />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/register" element={<RegisterByInvite />} />
                        <Route path="/report/:token" element={<PublicClientReport />} />
                        <Route path="/welcome" element={<Welcome />} />
                        <Route path="/subscription-success" element={<SubscriptionSuccess />} />
                        <Route path="/subscription-canceled" element={<SubscriptionCanceled />} />
                        
                        {/* Dashboard e páginas protegidas */}
                        <Route path="/dashboard" element={
                          <PaymentMiddlewareWrapper>
                            <AppLayout />
                          </PaymentMiddlewareWrapper>
                        }>
                          <Route index element={<Index />} />
                          <Route path="clients" element={<Clients />} />
                          <Route path="clients/:id" element={<ClientDetail />} />
                          <Route path="tasks" element={<Tasks />} />
                          <Route path="reminders" element={<Reminders />} />
                          <Route path="crm" element={<CRM />} />
                          <Route path="agenda" element={<Agenda />} />
                          <Route path="traffic" element={<Traffic />} />
                          <Route path="goals" element={<Goals />} />
                          <Route path="admin" element={<Admin />} />
                          <Route path="contracts" element={<Contracts />} />
                          <Route path="social-media" element={<SocialMedia />} />
                          <Route path="import" element={<Import />} />
                          <Route path="reports" element={<Reports />} />
                          <Route path="settings" element={<Settings />} />
                          <Route path="settings/notifications" element={<NotificationSettings />} />
                          <Route path="master" element={<Master />} />
                        </Route>
                        
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
