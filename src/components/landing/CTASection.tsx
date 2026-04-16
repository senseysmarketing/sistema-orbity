import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, Zap, LockOpen, MessageCircle } from "lucide-react";

interface CTASectionProps {
  onOpenScheduling?: () => void;
}

export function CTASection({ onOpenScheduling }: CTASectionProps) {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 py-24">
      <svg className="absolute inset-0 w-full h-full opacity-[0.05] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="constellation-cta" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
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
        <rect width="100%" height="100%" fill="url(#constellation-cta)" />
      </svg>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-5xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-12 md:p-20 text-center shadow-[0_0_50px_rgba(139,92,246,0.15)] relative overflow-hidden">
          {/* Light reflection */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            A sua agência no estado da arte.
          </h2>

          <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
            Junte-se à nova era da gestão. Teste o Orbity por 7 dias grátis e cancele com um clique se não amar a plataforma.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="text-lg px-8 py-6 h-auto bg-white text-purple-950 hover:bg-slate-100 font-semibold shadow-[0_0_25px_rgba(139,92,246,0.2)] hover:shadow-[0_0_35px_rgba(139,92,246,0.4)] transition-all"
              onClick={() => navigate('/onboarding?flow=trial')}
            >
              Começar Teste Grátis
              <ArrowRight className="ml-2" />
            </Button>
            <Button
              size="lg"
              className="text-lg px-8 py-6 h-auto bg-white/10 text-white border border-white/20 hover:bg-white/20"
              onClick={onOpenScheduling}
            >
              <CalendarDays className="mr-2" />
              Agendar Apresentação
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            <div className="text-sm text-slate-400 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Setup Imediato
            </div>
            <div className="text-sm text-slate-400 flex items-center gap-2">
              <LockOpen className="w-4 h-4" />
              Sem Fidelidade
            </div>
            <div className="text-sm text-slate-400 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Suporte via WhatsApp
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
