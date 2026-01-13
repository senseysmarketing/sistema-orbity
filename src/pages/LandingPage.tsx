import { useEffect } from "react";
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

export default function LandingPage() {
  // Rastrear visualização da Landing Page
  useEffect(() => {
    trackViewContent({
      content_name: 'Landing Page',
      content_category: 'Marketing'
    });
  }, []);
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
