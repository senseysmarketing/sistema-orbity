import { Check, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const differentials = [
  {
    title: "Integrações Nativas",
    description: "Conexão direta com Meta (Facebook/Instagram Ads) e Google Calendar sem ferramentas terceiras."
  },
  {
    title: "Interface 100% Brasileira",
    description: "Desenvolvido pensando em agências brasileiras, com nosso idioma, moeda e cultura."
  },
  {
    title: "Seus Dados Protegidos",
    description: "Utilizamos seus dados apenas para o funcionamento das integrações. Nunca vendemos ou compartilhamos suas informações."
  },
  {
    title: "Multi-agência",
    description: "Gerencie várias agências em uma única conta. Ideal para holdings e franquias."
  },
  {
    title: "Tudo em Um Lugar",
    description: "CRM, Social Media, Tráfego, Financeiro, Tarefas e Agenda em uma única plataforma."
  },
  {
    title: "Suporte Humanizado",
    description: "Atendimento real e personalizado. Sem bots, sem filas intermináveis."
  }
];

export function DifferentialsSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 bg-gradient-to-br from-[#1c102f]/10 via-background to-violet-500/10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Por que escolher{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1c102f] to-violet-600">nossa plataforma</span>?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Diferenciais que fazem a diferença no dia a dia da sua agência
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {differentials.map((differential, index) => (
            <div 
              key={index} 
              className="flex gap-4 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#1c102f]/15 flex items-center justify-center border border-[#1c102f]/30">
                  <Check className="w-5 h-5 text-[#1c102f] dark:text-violet-400" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{differential.title}</h3>
                <p className="text-muted-foreground">{differential.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className="bg-[#1c102f] hover:bg-[#1c102f]/90 text-white"
            onClick={() => navigate("/onboarding")}
          >
            Faça Parte Dessa Mudança
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
