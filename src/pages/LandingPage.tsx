import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { AIFeaturesSection } from "@/components/landing/AIFeaturesSection";
import { DemoSection } from "@/components/landing/DemoSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { DifferentialsSection } from "@/components/landing/DifferentialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { WhatsAppFloatingButton } from "@/components/landing/WhatsAppFloatingButton";
import { ApplicationModal } from "@/components/landing/ApplicationModal";
import { DemoSchedulingModal } from "@/components/landing/DemoSchedulingModal";
import { trackViewContent } from "@/lib/metaPixel";
import { useAuth } from "@/hooks/useAuth";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [schedulingOpen, setSchedulingOpen] = useState(false);

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as any).standalone === true;

  useEffect(() => {
    if (isStandalone && !loading) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/auth', { replace: true });
      }
    }
  }, [isStandalone, user, loading, navigate]);

  useEffect(() => {
    if (!isStandalone) {
      trackViewContent({
        content_name: 'Landing Page',
        content_category: 'Marketing'
      });
    }
  }, [isStandalone]);

  const openApplication = () => setApplicationOpen(true);
  const openScheduling = () => setSchedulingOpen(true);

  if (isStandalone && loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <HeroSection onOpenApplication={openApplication} onOpenScheduling={openScheduling} />
      <ProblemSection />
      <FeaturesGrid onOpenApplication={openApplication} />
      <AIFeaturesSection />
      <DemoSection onOpenApplication={openApplication} />
      <IntegrationsSection />
      <DifferentialsSection />
      <PricingSection onOpenScheduling={openScheduling} />
      <TestimonialsSection />
      <FAQSection onOpenApplication={openApplication} onOpenScheduling={openScheduling} />
      <CTASection onOpenApplication={openApplication} onOpenScheduling={openScheduling} />
      <LandingFooter />
      <WhatsAppFloatingButton />
      <ApplicationModal open={applicationOpen} onOpenChange={setApplicationOpen} />
      <DemoSchedulingModal open={schedulingOpen} onOpenChange={setSchedulingOpen} />
    </div>
  );
}
