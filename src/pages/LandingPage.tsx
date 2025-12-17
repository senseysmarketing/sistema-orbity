import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { DifferentialsSection } from "@/components/landing/DifferentialsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <ProblemSection />
      <FeaturesGrid />
      <IntegrationsSection />
      <DifferentialsSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
