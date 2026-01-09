import { useState } from "react";
import { LayoutDashboard, Users, CheckSquare, Target, Instagram, Calendar, FileText } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// Imports das imagens
import dashboardImg from "@/assets/landing/Dashboard.jpg";
import crmImg from "@/assets/landing/CRM.jpg";
import tarefasImg from "@/assets/landing/Tarefas.jpg";
import agendaImg from "@/assets/landing/Agenda.jpg";
import socialMediaImg from "@/assets/landing/SocialMedia.jpg";
import clientesImg from "@/assets/landing/Clientes.jpg";
import relatoriosImg from "@/assets/landing/AnalisesERelatorios.jpg";

const screenshots = [
  {
    id: 1,
    title: "Dashboard Completo",
    description: "Visão geral de todas as métricas da sua agência em tempo real",
    icon: LayoutDashboard,
    image: dashboardImg,
  },
  {
    id: 2,
    title: "CRM & Funil de Vendas",
    description: "Gerencie leads com Kanban visual e acompanhe cada etapa",
    icon: Target,
    image: crmImg,
  },
  {
    id: 3,
    title: "Gestão de Tarefas",
    description: "Organize tarefas por prioridade e acompanhe o progresso da equipe",
    icon: CheckSquare,
    image: tarefasImg,
  },
  {
    id: 4,
    title: "Agenda & Reuniões",
    description: "Calendário integrado com todas as reuniões e compromissos",
    icon: Calendar,
    image: agendaImg,
  },
  {
    id: 5,
    title: "Social Media Planner",
    description: "Planeje e organize posts para todas as redes sociais",
    icon: Instagram,
    image: socialMediaImg,
  },
  {
    id: 6,
    title: "Gestão de Clientes",
    description: "Todos os dados dos seus clientes organizados em um só lugar",
    icon: Users,
    image: clientesImg,
  },
  {
    id: 7,
    title: "Relatórios & Analytics",
    description: "Métricas detalhadas para tomada de decisão estratégica",
    icon: FileText,
    image: relatoriosImg,
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
                <img 
                  src={screenshot.image} 
                  alt={screenshot.title}
                  className="aspect-video rounded-lg object-cover object-top w-full shadow-md"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <CarouselPrevious className="left-4 md:left-6 h-10 w-10 bg-white/95 hover:bg-white border-gray-200 shadow-lg z-10" />
        <CarouselNext className="right-4 md:right-6 h-10 w-10 bg-white/95 hover:bg-white border-gray-200 shadow-lg z-10" />
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
