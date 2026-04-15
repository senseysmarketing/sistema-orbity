import { Rocket, ShieldCheck, TrendingUp } from "lucide-react";

const pillars = [
  {
    icon: Rocket,
    title: "Onboarding Premium",
    description:
      "Esqueça os tutoriais intermináveis. A nossa equipa acompanha os seus primeiros passos para garantir que a sua agência está configurada e pronta a faturar em tempo recorde.",
  },
  {
    icon: ShieldCheck,
    title: "Ecossistema Blindado",
    description:
      "Dados centralizados, processos à prova de falhas e permissões granulares. A sua equipa e os seus clientes operam num ambiente 100% focado em conversão.",
  },
  {
    icon: TrendingUp,
    title: "Evolução Contínua",
    description:
      "O Orbity não é estático. Lançamos atualizações semanais baseadas no que realmente funciona nas trincheiras do mercado de agências atual.",
  },
];

export function DifferentialsSection() {
  return (
    <section className="relative overflow-hidden py-24 bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 text-white">
      {/* Constellation pattern */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.05]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="constellation-diff" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
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
        <rect width="100%" height="100%" fill="url(#constellation-diff)" />
      </svg>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Criado por donos de agência.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-500">
              Desenvolvido para escalar.
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            Não somos apenas mais um software. Somos o padrão operacional das agências que dominam o mercado.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pillars.map((pillar, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-8 lg:p-10 hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-2 group"
            >
              <div className="bg-purple-500/10 p-4 rounded-2xl w-fit mb-6 group-hover:scale-110 transition-transform duration-300">
                <pillar.icon className="text-purple-400 w-7 h-7" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">{pillar.title}</h3>
              <p className="text-slate-400 leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
