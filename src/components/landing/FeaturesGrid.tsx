import { FeatureCard } from "./FeatureCard";
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  DollarSign, 
  CheckSquare, 
  FileText, 
  Calendar, 
  Bell 
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "CRM Inteligente",
    description: "Funil visual de vendas, captura automática de leads do Facebook Lead Ads, alertas de follow-up",
    gradient: "from-blue-500/20 to-cyan-500/20"
  },
  {
    icon: MessageSquare,
    title: "Social Media em Escala",
    description: "Calendário de posts, aprovação em equipe, biblioteca de conteúdo, agendamento multi-plataforma",
    gradient: "from-purple-500/20 to-pink-500/20"
  },
  {
    icon: TrendingUp,
    title: "Integração Nativa com Meta",
    description: "Conexão direta com Facebook Ads e Instagram. Dashboard de campanhas, métricas em tempo real e alertas de saldo",
    gradient: "from-green-500/20 to-emerald-500/20"
  },
  {
    icon: DollarSign,
    title: "Gestão Financeira Completa",
    description: "Controle de recebimentos, despesas, salários, projeções e métricas de churn",
    gradient: "from-yellow-500/20 to-orange-500/20"
  },
  {
    icon: CheckSquare,
    title: "Tarefas & Projetos",
    description: "Kanban inteligente, subtarefas, templates reutilizáveis, atribuição multi-usuário",
    gradient: "from-red-500/20 to-rose-500/20"
  },
  {
    icon: FileText,
    title: "Contratos Automáticos",
    description: "Geração de contratos com templates personalizáveis e exportação em PDF",
    gradient: "from-indigo-500/20 to-blue-500/20"
  },
  {
    icon: Calendar,
    title: "Integração com Google Calendar",
    description: "Sincronização bidirecional de reuniões, criação automática de Google Meet e notificações",
    gradient: "from-teal-500/20 to-cyan-500/20"
  },
  {
    icon: Bell,
    title: "Notificações Inteligentes",
    description: "Alertas por email, resumo diário configurável e lembretes automáticos de prazos",
    gradient: "from-violet-500/20 to-purple-500/20"
  }
];

export function FeaturesGrid() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tudo que sua agência precisa, em uma única ferramenta
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Funcionalidades completas para gerenciar todos os aspectos do seu negócio
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} delay={index * 0.1} />
          ))}
        </div>
      </div>
    </section>
  );
}
