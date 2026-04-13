import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Shield } from "lucide-react";

interface CTASectionProps {
  onOpenApplication?: () => void;
  onOpenScheduling?: () => void;
}

export function CTASection({ onOpenApplication, onOpenScheduling }: CTASectionProps) {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-br from-[#1c102f] via-primary to-secondary">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground">
            Pronto para Transformar sua Agência?
          </h2>
          
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            Comece com 7 dias grátis ou agende uma apresentação personalizada com nosso time
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6 h-auto"
              onClick={() => navigate('/onboarding?flow=trial')}
            >
              Começar Teste Grátis (7 Dias)
              <ArrowRight className="ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 h-auto border-white/30 text-primary-foreground hover:bg-white/10"
              onClick={onOpenScheduling}
            >
              <CalendarDays className="mr-2" />
              Agendar Apresentação
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 pt-4">
            <Shield className="w-5 h-5 text-primary-foreground/80" />
            <p className="text-primary-foreground/80">
              Sem cartão de crédito • 7 dias grátis • Cancele a qualquer momento
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 max-w-3xl mx-auto">
            <div className="text-primary-foreground/90">
              <div className="text-3xl font-bold mb-2">100+</div>
              <div className="text-sm">Agências ativas</div>
            </div>
            <div className="text-primary-foreground/90">
              <div className="text-3xl font-bold mb-2">R$ 297</div>
              <div className="text-sm">A partir de /mês</div>
            </div>
            <div className="text-primary-foreground/90">
              <div className="text-3xl font-bold mb-2">4.9/5</div>
              <div className="text-sm">Avaliação média</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
