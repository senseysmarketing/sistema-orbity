import { useState } from "react";
import { ChevronLeft, ChevronRight, LayoutDashboard, Users, CheckSquare, Target, Instagram, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const screenshots = [
  {
    id: 1,
    title: "Dashboard Completo",
    description: "Visão geral de todas as métricas da sua agência em tempo real",
    icon: LayoutDashboard,
    gradient: "from-purple-600 to-indigo-600",
  },
  {
    id: 2,
    title: "CRM & Funil de Vendas",
    description: "Gerencie leads com Kanban visual e acompanhe cada etapa",
    icon: Target,
    gradient: "from-blue-600 to-cyan-600",
  },
  {
    id: 3,
    title: "Gestão de Tarefas",
    description: "Organize tarefas por prioridade e acompanhe o progresso da equipe",
    icon: CheckSquare,
    gradient: "from-green-600 to-emerald-600",
  },
  {
    id: 4,
    title: "Agenda & Reuniões",
    description: "Calendário integrado com todas as reuniões e compromissos",
    icon: Calendar,
    gradient: "from-orange-600 to-amber-600",
  },
  {
    id: 5,
    title: "Social Media Planner",
    description: "Planeje e organize posts para todas as redes sociais",
    icon: Instagram,
    gradient: "from-pink-600 to-rose-600",
  },
  {
    id: 6,
    title: "Gestão de Clientes",
    description: "Todos os dados dos seus clientes organizados em um só lugar",
    icon: Users,
    gradient: "from-violet-600 to-purple-600",
  },
  {
    id: 7,
    title: "Relatórios & Analytics",
    description: "Métricas detalhadas para tomada de decisão estratégica",
    icon: FileText,
    gradient: "from-teal-600 to-cyan-600",
  },
];

export function DemoCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div className="w-full">
      <Carousel
        opts={{
          align: "center",
          loop: true,
        }}
        className="w-full"
        setApi={(api) => {
          api?.on("select", () => {
            setCurrentIndex(api.selectedScrollSnap());
          });
        }}
      >
        <CarouselContent>
          {screenshots.map((screenshot) => (
            <CarouselItem key={screenshot.id}>
              <div className="p-1">
                {/* Placeholder visual - substituir por screenshots reais */}
                <div 
                  className={`aspect-video rounded-lg bg-gradient-to-br ${screenshot.gradient} flex flex-col items-center justify-center text-white p-8`}
                >
                  <screenshot.icon className="h-16 w-16 md:h-24 md:w-24 mb-4 opacity-90" />
                  <p className="text-sm md:text-base text-white/70 text-center">
                    Substitua por screenshot real de:
                  </p>
                  <p className="text-lg md:text-xl font-semibold text-center">
                    {screenshot.title}
                  </p>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <CarouselPrevious className="left-2 md:-left-12 bg-white/90 hover:bg-white border-gray-200" />
        <CarouselNext className="right-2 md:-right-12 bg-white/90 hover:bg-white border-gray-200" />
      </Carousel>

      {/* Info da screenshot atual */}
      <div className="text-center mt-6">
        <h3 className="text-xl font-semibold text-foreground">
          {screenshots[currentIndex]?.title}
        </h3>
        <p className="text-muted-foreground mt-1">
          {screenshots[currentIndex]?.description}
        </p>
      </div>

      {/* Indicadores */}
      <div className="flex justify-center gap-2 mt-4">
        {screenshots.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex 
                ? "bg-[#1c102f]" 
                : "bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Ir para slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
