import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Shield } from "lucide-react";

export function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-br from-[#1c102f] via-primary to-secondary">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground">
            Pronto para Transformar sua Agência?
          </h2>
          
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            Junte-se a centenas de agências que já escalaram suas operações com nossa plataforma
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6 h-auto"
              onClick={() => navigate("/auth?signup=true")}
            >
              Começar Teste Grátis de 7 Dias
              <ArrowRight className="ml-2" />
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 pt-4">
            <Shield className="w-5 h-5 text-primary-foreground/80" />
            <p className="text-primary-foreground/80">
              Não precisa cartão de crédito • Cancele quando quiser
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12 max-w-3xl mx-auto">
            <div className="text-primary-foreground/90">
              <div className="text-3xl font-bold mb-2">7 dias</div>
              <div className="text-sm">Teste grátis</div>
            </div>
            <div className="text-primary-foreground/90">
              <div className="text-3xl font-bold mb-2">100+</div>
              <div className="text-sm">Agências ativas</div>
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
