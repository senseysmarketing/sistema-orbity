import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface PricingSectionProps {
  onOpenScheduling?: () => void;
}

const features = [
  "CRM completo com pipeline visual",
  "Gestão financeira e cobranças",
  "Integração Facebook Ads",
  "Automação de tarefas",
  "Relatórios de performance",
  "Gestão de equipe e clientes",
  "Suporte via WhatsApp",
  "Onboarding personalizado",
];

export function PricingSection({ onOpenScheduling }: PricingSectionProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Preços Transparentes
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Plano Único. Tudo Incluso.
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Acesse todos os módulos da plataforma. Sem surpresas, sem cobranças extras.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Mensal</span>
          <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
          <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Anual
            <Badge className="ml-2 bg-green-500/10 text-green-600 border-green-500/20 text-xs">
              Economize R$ 1.200
            </Badge>
          </span>
        </div>

        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card className="border-2 border-primary/30 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1c102f] to-violet-600" />
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl">Orbity Pro</CardTitle>
                <p className="text-muted-foreground text-sm">Tudo que sua agência precisa</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-sm text-muted-foreground">R$</span>
                    <span className="text-5xl font-bold">{isAnnual ? '297' : '397'}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Cobrado anualmente (R$ 3.564/ano)
                    </p>
                  )}
                  {!isAnnual && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Sem fidelidade. Cancele quando quiser.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  <Button
                    size="lg"
                    className="w-full text-base bg-[#1c102f] hover:bg-[#1c102f]/90 text-white"
                    onClick={() => navigate('/onboarding?flow=trial')}
                  >
                    Começar Teste Grátis (7 Dias)
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full text-base border-[#1c102f]/30"
                    onClick={onOpenScheduling}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Agendar Apresentação
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  7 dias grátis • Sem cartão de crédito • Cancele a qualquer momento
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
