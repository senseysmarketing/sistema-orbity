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
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950">
        <svg className="absolute inset-0 w-full h-full opacity-[0.05] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="constellation-features" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1.5" fill="white" />
              <circle cx="80" cy="50" r="1" fill="white" />
              <circle cx="150" cy="30" r="2" fill="white" />
              <circle cx="40" cy="120" r="1" fill="white" />
              <circle cx="120" cy="100" r="1.5" fill="white" />
              <circle cx="180" cy="150" r="1" fill="white" />
              <circle cx="60" cy="180" r="1.5" fill="white" />
              <circle cx="140" cy="170" r="1" fill="white" />
              <line x1="20" y1="20" x2="80" y2="50" stroke="white" strokeWidth="0.3" />
              <line x1="80" y1="50" x2="150" y2="30" stroke="white" strokeWidth="0.3" />
              <line x1="120" y1="100" x2="180" y2="150" stroke="white" strokeWidth="0.3" />
              <line x1="40" y1="120" x2="120" y2="100" stroke="white" strokeWidth="0.3" />
              <line x1="60" y1="180" x2="140" y2="170" stroke="white" strokeWidth="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#constellation-features)" />
        </svg>
        <FeaturesGrid onOpenApplication={openApplication} />
        <AIFeaturesSection />
      </div>
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
