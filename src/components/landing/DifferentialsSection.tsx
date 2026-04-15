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
    <section className="py-24 bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 text-white">
      <div className="container mx-auto px-4">
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
