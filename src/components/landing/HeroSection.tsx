import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, MessageCircle, BarChart3, DollarSign } from "lucide-react";

import { motion } from "framer-motion";
import orbiMascot from "@/assets/orbi-mascot-new.png";

interface HeroSectionProps {
  onOpenApplication?: () => void;
  onOpenScheduling?: () => void;
}

export function HeroSection({ onOpenScheduling }: HeroSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 pt-28 md:pt-40 pb-20 md:pb-32">
      {/* Constellation pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="constellation" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
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
        <rect width="100%" height="100%" fill="url(#constellation)" />
      </svg>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Text side */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-block px-4 py-2 bg-white/10 rounded-full border border-white/20"
            >
              <span className="text-sm font-medium text-white">✨ 7 Dias Grátis • Sem Cartão de Crédito</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight"
            >
              O Ecossistema Completo para{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-purple-200">
                Escalar a sua Agência
              </span>{" "}
              de Marketing
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-lg md:text-xl text-white/70 max-w-xl"
            >
              Tarefas, Campanhas, CRM integrado e Financeiro automatizado com WhatsApp. Tudo em um só lugar.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                size="lg"
                className="text-lg bg-white text-purple-950 hover:bg-white/90"
                onClick={() => navigate("/onboarding?flow=trial")}
              >
                Começar Teste Grátis
                <ArrowRight className="ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg bg-transparent border-white/30 text-white hover:bg-white/10 hover:border-white/50"
                onClick={onOpenScheduling}
              >
                <CalendarDays className="mr-2 h-5 w-5" />
                Agendar Apresentação
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="space-y-3 pt-4"
            >
              <p className="text-sm text-white/50">
                Usado por <strong className="text-white/80">40+ agências</strong> de marketing
              </p>
            </motion.div>
          </div>

          {/* Orbi mascot side */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.8, type: "spring", damping: 15 }}
            className="relative flex-shrink-0"
          >
            {/* Orbiting icons */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-orbit opacity-30" style={{ animationDelay: "0s" }}>
                  <div className="bg-green-500/20 border border-green-400/30 rounded-full p-2">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                  </div>
                </div>
                <div className="absolute top-1/2 right-0 -translate-y-1/2 animate-orbit opacity-30" style={{ animationDelay: "-4s" }}>
                  <div className="bg-blue-500/20 border border-blue-400/30 rounded-full p-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-1/4 animate-orbit opacity-30" style={{ animationDelay: "-8s" }}>
                  <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-full p-2">
                    <DollarSign className="w-4 h-4 text-yellow-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Orbi mascot */}
            <img
              src={orbiMascot}
              alt="Orbi - Mascote do Orbity"
              className="relative z-10 animate-float max-w-[250px] md:max-w-md lg:max-w-lg drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
