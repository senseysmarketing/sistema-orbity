import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { DemoSection } from "@/components/landing/DemoSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { DifferentialsSection } from "@/components/landing/DifferentialsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { WhatsAppFloatingButton } from "@/components/landing/WhatsAppFloatingButton";
import { trackViewContent } from "@/lib/metaPixel";
import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Detectar se está em modo standalone (PWA instalado)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as any).standalone === true;

  // Redirecionamento inteligente para PWA
  useEffect(() => {
    if (isStandalone && !loading) {
      if (user) {
        // Usuário logado no PWA → vai direto pro dashboard
        navigate('/dashboard', { replace: true });
      } else {
        // Usuário não logado no PWA → vai pro login
        navigate('/auth', { replace: true });
      }
    }
  }, [isStandalone, user, loading, navigate]);

  // Rastrear visualização da Landing Page (apenas se não for redirecionar)
  useEffect(() => {
    if (!isStandalone) {
      trackViewContent({
        content_name: 'Landing Page',
        content_category: 'Marketing'
      });
    }
  }, [isStandalone]);

  // Se está no PWA e ainda carregando auth, não renderiza nada (evita flash)
  if (isStandalone && loading) {
    return null;
  }
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <ProblemSection />
      <FeaturesGrid />
      <DemoSection />
      <IntegrationsSection />
      <DifferentialsSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
