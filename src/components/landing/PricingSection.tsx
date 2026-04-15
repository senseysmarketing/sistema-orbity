import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

interface PricingSectionProps {
  onOpenScheduling?: () => void;
}

const features = [
  "Membros ilimitados da equipa",
  "CRM de Vendas & Pipeline",
  "Automação de WhatsApp Multi-instância",
  "Gestor de Redes Sociais com IA",
  "Cobrança Automática (Asaas/Conexa)",
  "Agenda sincronizada com Google Calendar",
  "Onboarding Premium Dedicado",
];

export function PricingSection({ onOpenScheduling }: PricingSectionProps) {
  const [isAnnual, setIsAnnual] = useState(true);
  const navigate = useNavigate();

  return (
    <section id="pricing" className="bg-slate-50 py-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
          {/* Coluna Esquerda — Proposta de Valor */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
                O motor de crescimento da sua agência.
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                Sem letras miúdas. Sem limitações artificiais. Acesso total a todas as ferramentas desde o primeiro dia.
              </p>
            </div>

            <ul className="space-y-4">
              {features.map((feature, i) => (
                <motion.li
                  key={i}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 * i }}
                >
                  <CheckCircle2 className="h-5 w-5 text-purple-600 shrink-0" />
                  <span className="text-slate-700 font-medium">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Coluna Direita — Spotlight Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="group bg-gradient-to-br from-purple-950 to-indigo-950 rounded-[2rem] p-10 relative overflow-hidden border border-purple-500/30 shadow-[0_0_50px_rgba(139,92,246,0.25)] hover:border-purple-500/60 transition-all duration-500">
              {/* Glow accent */}
              <div className="ring-1 ring-white/10 absolute inset-0 rounded-[2rem] pointer-events-none" />
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Toggle Mensal / Anual */}
              <div className="flex items-center justify-center gap-1 mb-8">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    !isAnnual
                      ? "bg-white text-slate-900"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    isAnnual
                      ? "bg-white text-slate-900"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Anual
                </button>
                {isAnnual && (
                  <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full bg-green-500/15 text-green-400 text-xs font-semibold border border-green-500/20">
                    Poupa R$ 1.200/ano
                  </span>
                )}
              </div>

              {/* Preço */}
              <div className="text-center mb-8">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-slate-400 text-lg">R$</span>
                  <span className="text-6xl font-bold text-white tabular-nums">
                    {isAnnual ? "297" : "397"}
                  </span>
                  <span className="text-slate-400 text-lg">/mês</span>
                </div>
                <p className="text-slate-500 text-sm mt-2">
                  {isAnnual
                    ? "R$ 3.564 faturados anualmente."
                    : "Faturado mensalmente. Cancele quando quiser."}
                </p>
              </div>

              {/* CTAs */}
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full text-base bg-primary hover:bg-primary/90 text-white h-14 text-lg rounded-xl"
                  onClick={() => navigate("/onboarding?flow=trial")}
                >
                  Começar Teste de 7 Dias
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full text-base border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white h-12 rounded-xl bg-transparent"
                  onClick={onOpenScheduling}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Agendar Apresentação
                </Button>
              </div>

              <p className="text-xs text-center text-slate-600 mt-6">
                7 dias grátis • Sem cartão de crédito • Cancele a qualquer momento
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
