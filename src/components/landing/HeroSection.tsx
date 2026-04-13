import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, LayoutDashboard, Users, TrendingUp, CheckSquare } from "lucide-react";
import { AgencyLogos } from "./AgencyLogos";
import { motion } from "framer-motion";

const titleWords = "Orbity: O Sistema Operacional das Agências de Alta Performance.".split(" ");

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const wordVariants = {
  hidden: { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 12, stiffness: 100 } },
};

interface HeroSectionProps {
  onOpenApplication?: () => void;
  onOpenScheduling?: () => void;
}

export function HeroSection({ onOpenScheduling }: HeroSectionProps) {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1c102f]/15 via-background to-violet-500/10 py-24 md:py-36">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center max-w-5xl mx-auto space-y-8">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-block px-4 py-2 bg-[#1c102f]/15 rounded-full border border-[#1c102f]/30">
            <span className="text-sm font-medium text-[#1c102f] dark:text-violet-300">✨ 7 Dias Grátis • Sem Cartão de Crédito</span>
          </motion.div>

          <motion.h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight" variants={containerVariants} initial="hidden" animate="visible">
            {titleWords.map((word, i) => (
              <motion.span key={i} variants={wordVariants} className={`inline-block mr-[0.3em] ${word === "Orbity:" ? "text-transparent bg-clip-text bg-gradient-to-r from-[#1c102f] to-violet-600" : ""}`}>
                {word}
              </motion.span>
            ))}
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.6 }} className="text-xl md:text-2xl text-muted-foreground max-w-3xl">
            Centralize CRM, Financeiro, Tráfego e Social em uma plataforma inteligente. Automatize processos, fature mais e pare de queimar neurônios com planilhas.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.5 }} className="flex flex-col sm:flex-row gap-4">
            <Button size="lg" className="text-lg bg-[#1c102f] hover:bg-[#1c102f]/90 text-white" onClick={() => navigate('/onboarding?flow=trial')}>
              Começar Teste Grátis
              <ArrowRight className="ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg border-[#1c102f]/30 hover:bg-[#1c102f]/10 hover:border-[#1c102f]/50" onClick={onOpenScheduling}>
              <CalendarDays className="mr-2 h-5 w-5" />
              Agendar Apresentação
            </Button>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 0.6 }} className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">Usado por <strong className="text-foreground">100+ agências</strong> de marketing</p>
            <AgencyLogos />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 1.4, duration: 0.8, type: "spring", damping: 20 }} className="relative w-full max-w-4xl mt-8">
            <div className="relative rounded-2xl border-2 border-[#1c102f]/20 bg-card shadow-2xl overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-[#1c102f]/10 to-violet-500/10 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#1c102f] flex items-center justify-center"><LayoutDashboard className="w-4 h-4 text-white" /></div>
                    <span className="font-semibold text-sm">Dashboard</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/80 dark:bg-white/10 rounded-lg p-3 border border-[#1c102f]/10">
                    <Users className="w-4 h-4 text-[#1c102f] mb-1" /><div className="text-lg font-bold">24</div><div className="text-xs text-muted-foreground">Clientes</div>
                  </div>
                  <div className="bg-white/80 dark:bg-white/10 rounded-lg p-3 border border-violet-500/20">
                    <TrendingUp className="w-4 h-4 text-violet-600 mb-1" /><div className="text-lg font-bold">128</div><div className="text-xs text-muted-foreground">Leads</div>
                  </div>
                  <div className="bg-white/80 dark:bg-white/10 rounded-lg p-3 border border-purple-500/20">
                    <CheckSquare className="w-4 h-4 text-purple-600 mb-1" /><div className="text-lg font-bold">56</div><div className="text-xs text-muted-foreground">Tarefas</div>
                  </div>
                </div>
                <div className="flex-1 bg-white/60 dark:bg-white/5 rounded-lg p-3 border border-[#1c102f]/10">
                  <div className="flex items-end gap-1 h-full justify-around">
                    {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                      <div key={i} className="w-6 rounded-t bg-gradient-to-t from-[#1c102f] to-violet-500" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -z-10 top-10 -right-10 w-72 h-72 bg-[#1c102f]/20 rounded-full blur-3xl" />
            <div className="absolute -z-10 -bottom-10 -left-10 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
