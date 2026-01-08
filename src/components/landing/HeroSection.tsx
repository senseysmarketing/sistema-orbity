import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, LayoutDashboard, Users, TrendingUp, CheckSquare } from "lucide-react";
import { AgencyLogos } from "./AgencyLogos";

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#1c102f]/15 via-background to-violet-500/10 py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="inline-block px-4 py-2 bg-[#1c102f]/15 rounded-full border border-[#1c102f]/30">
              <span className="text-sm font-medium text-[#1c102f] dark:text-violet-300">
                ✨ A Plataforma Completa para Agências
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              Escale sua Agência de{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1c102f] to-violet-600">Marketing Digital</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl">
              Gerencie clientes, leads, projetos, social media e tráfego pago em um único lugar. 
              Economize tempo, aumente receita e nunca perca um prazo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="text-lg bg-[#1c102f] hover:bg-[#1c102f]/90 text-white"
                onClick={() => navigate("/auth?signup=true")}
              >
                Começar Teste Grátis
                <ArrowRight className="ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg border-[#1c102f]/30 hover:bg-[#1c102f]/10 hover:border-[#1c102f]/50"
                onClick={() => navigate("/auth")}
              >
                Já tenho conta
              </Button>
            </div>

            <div className="space-y-3 pt-4">
              <p className="text-sm text-muted-foreground">
                Usado por <strong className="text-foreground">100+ agências</strong> de marketing
              </p>
              <AgencyLogos />
            </div>
          </div>

          <div className="relative animate-fade-in">
            <div className="relative rounded-2xl border-2 border-[#1c102f]/20 bg-card shadow-2xl overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-[#1c102f]/10 to-violet-500/10 p-6 flex flex-col">
                {/* Mock Dashboard Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#1c102f] flex items-center justify-center">
                      <LayoutDashboard className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-sm">Dashboard</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                </div>
                
                {/* Mock Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/80 dark:bg-white/10 rounded-lg p-3 border border-[#1c102f]/10">
                    <Users className="w-4 h-4 text-[#1c102f] mb-1" />
                    <div className="text-lg font-bold">24</div>
                    <div className="text-xs text-muted-foreground">Clientes</div>
                  </div>
                  <div className="bg-white/80 dark:bg-white/10 rounded-lg p-3 border border-violet-500/20">
                    <TrendingUp className="w-4 h-4 text-violet-600 mb-1" />
                    <div className="text-lg font-bold">128</div>
                    <div className="text-xs text-muted-foreground">Leads</div>
                  </div>
                  <div className="bg-white/80 dark:bg-white/10 rounded-lg p-3 border border-purple-500/20">
                    <CheckSquare className="w-4 h-4 text-purple-600 mb-1" />
                    <div className="text-lg font-bold">56</div>
                    <div className="text-xs text-muted-foreground">Tarefas</div>
                  </div>
                </div>

                {/* Mock Chart */}
                <div className="flex-1 bg-white/60 dark:bg-white/5 rounded-lg p-3 border border-[#1c102f]/10">
                  <div className="flex items-end gap-1 h-full justify-around">
                    {[40, 65, 45, 80, 55, 90, 70].map((height, i) => (
                      <div 
                        key={i}
                        className="w-6 rounded-t bg-gradient-to-t from-[#1c102f] to-violet-500"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -z-10 top-10 -right-10 w-72 h-72 bg-[#1c102f]/20 rounded-full blur-3xl" />
            <div className="absolute -z-10 -bottom-10 -left-10 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
