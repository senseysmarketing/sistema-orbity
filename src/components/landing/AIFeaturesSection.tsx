import { Sparkles, Scale, PenTool, LineChart, ListChecks } from "lucide-react";
import { motion } from "framer-motion";

const aiFeatures = [
  {
    icon: Scale,
    label: "Copiloto Jurídico",
    title: "Contratos Inteligentes",
    description: "A IA redige contratos blindados e personalizados com os dados do seu CRM em segundos. Basta dizer qual cláusula você precisa.",
  },
  {
    icon: PenTool,
    label: "Diretor de Conteúdo",
    title: "Redator e Estrategista",
    description: "Gere calendários semanais, ideias de posts e legendas persuasivas focadas no nicho de cada cliente com um único clique.",
  },
  {
    icon: LineChart,
    label: "Analista de Performance",
    title: "Análise de Campanhas",
    description: "Uma IA que interpreta os dados da Meta Ads, identifica padrões e sugere otimizações reais para reduzir seu custo por conversão.",
  },
  {
    icon: ListChecks,
    label: "Gerente de Projetos",
    title: "Automação Operacional",
    description: "Descreva um projeto e deixe a IA quebrar o escopo em dezenas de subtarefas, otimizando o tempo de setup da sua equipe.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function AIFeaturesSection() {
  return (
    <section
      className="relative py-24 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(109,40,217,0.15) 0%, #1c102f 50%, #0f0a1a 100%)",
      }}
    >
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 text-violet-400 text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Orbity AI Copilot
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Um cérebro treinado para escalar agências.
          </h2>
          <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto">
            Cancele assinaturas de IAs genéricas. O Orbity possui inteligência artificial nativa e ilimitada para automatizar de contratos a campanhas.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {aiFeatures.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 transition-all hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-violet-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-violet-400" />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-violet-400/70">
                  {feature.label}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
