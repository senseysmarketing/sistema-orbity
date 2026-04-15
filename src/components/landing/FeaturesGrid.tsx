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
import { motion } from "framer-motion";

const features = [
  {
    icon: Users,
    title: "Feche Mais Contratos",
    description: "Pipeline visual e automação de leads. Acompanhe cada oportunidade do primeiro contato ao fechamento.",
    colSpan: "lg:col-span-2",
  },
  {
    icon: Palette,
    title: "Produza Criativos que Convertem",
    description: "Prazos, briefings e aprovação em um clique. Fluxo criativo sem gargalos.",
    colSpan: "",
  },
  {
    icon: DollarSign,
    title: "Inadimplência Zero",
    description: "Cobrança automática por PIX/Boleto e fluxo de caixa em tempo real.",
    colSpan: "",
  },
  {
    icon: TrendingUp,
    title: "Escale o ROI de Anúncios",
    description: "Monitoramento de Meta e Google Ads integrado. Alertas de saldo e métricas em tempo real.",
    colSpan: "lg:col-span-2",
  },
  {
    icon: Calendar,
    title: "Gestão de Conteúdo Simplificada",
    description: "Calendário editorial e agendamento de posts multi-plataforma.",
    colSpan: "",
  },
  {
    icon: BarChart3,
    title: "Decisões Baseadas em Dados",
    description: "Dashboards de performance em tempo real para sua agência e clientes.",
    colSpan: "",
  },
];

export function FeaturesGrid({ onOpenApplication }: { onOpenApplication?: () => void }) {
  return (
    <section id="features" className="pt-24 pb-8">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-white">
            O seu novo ecossistema de{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-300">
              alta performance.
            </span>
          </h2>
          <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto">
            Substitua dezenas de ferramentas fragmentadas por uma única plataforma inteligente.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className={`${feature.colSpan} bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden group hover:bg-white/10 hover:border-purple-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] p-8`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-500">
                <feature.icon className="w-7 h-7 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{feature.description}</p>
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
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 hover:border-white/40"
            onClick={onOpenApplication}
          >
            Quero Conhecer o Orbity
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
