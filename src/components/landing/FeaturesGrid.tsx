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
    description: "Funil visual de vendas, captura automática de leads via webhook, alertas de follow-up",
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
    title: "Tráfego Pago Conectado",
    description: "Integração nativa com Facebook Ads, dashboard de campanhas, alertas de saldo baixo",
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
    description: "Kanban inteligente, subtarefas, atribuição multi-usuário, alertas de prazos",
    gradient: "from-red-500/20 to-rose-500/20"
  },
  {
    icon: FileText,
    title: "Contratos Automáticos",
    description: "Geração de contratos com templates personalizáveis, assinatura digital",
    gradient: "from-indigo-500/20 to-blue-500/20"
  },
  {
    icon: Calendar,
    title: "Agenda Integrada",
    description: "Calendário de reuniões, notas de meeting, lembretes automáticos",
    gradient: "from-teal-500/20 to-cyan-500/20"
  },
  {
    icon: Bell,
    title: "Notificações Inteligentes",
    description: "Sistema configurável de alertas, modo não perturbe, períodos personalizados",
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
