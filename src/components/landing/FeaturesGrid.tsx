import { FeatureCard } from "./FeatureCard";
import { Button } from "@/components/ui/button";
import {
  Users,
  TrendingUp,
  Palette,
  DollarSign,
  Calendar,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const features = [
  {
    icon: Users,
    title: "Feche Mais Contratos",
    description: "Pipeline visual e automação de leads. Acompanhe cada oportunidade do primeiro contato ao fechamento.",
    gradient: "from-[#1c102f]/20 to-violet-500/20",
    large: true,
  },
  {
    icon: TrendingUp,
    title: "Escale o ROI de Anúncios",
    description: "Monitoramento de Meta e Google Ads integrado. Alertas de saldo e métricas em tempo real.",
    gradient: "from-violet-500/20 to-purple-500/20",
    large: true,
  },
  {
    icon: Palette,
    title: "Produza Criativos que Convertem",
    description: "Prazos, briefings e aprovação em um clique. Fluxo criativo sem gargalos.",
    gradient: "from-[#1c102f]/20 to-indigo-500/20",
  },
  {
    icon: DollarSign,
    title: "Inadimplência Zero",
    description: "Cobrança automática por PIX/Boleto e fluxo de caixa em tempo real.",
    gradient: "from-purple-500/20 to-violet-500/20",
  },
  {
    icon: Calendar,
    title: "Gestão de Conteúdo Simplificada",
    description: "Calendário editorial e agendamento de posts multi-plataforma.",
    gradient: "from-indigo-500/20 to-violet-500/20",
  },
  {
    icon: BarChart3,
    title: "Decisões Baseadas em Dados",
    description: "Dashboards de performance em tempo real para sua agência e clientes.",
    gradient: "from-violet-500/20 to-[#1c102f]/20",
  },
];

export function FeaturesGrid() {
  const navigate = useNavigate();

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tudo que sua agência precisa, em uma{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1c102f] to-violet-600">
              única ferramenta
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Benefícios reais que transformam a operação do seu negócio
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className={feature.large ? "lg:col-span-2" : ""}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <FeatureCard {...feature} />
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Button
            size="lg"
            className="bg-[#1c102f] hover:bg-[#1c102f]/90 text-white"
            onClick={() => navigate("/onboarding")}
          >
            Experimente Todas as Funções
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            7 dias grátis, sem cartão de crédito
          </p>
        </motion.div>
      </div>
    </section>
  );
}
