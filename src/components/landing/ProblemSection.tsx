import { Card, CardContent } from "@/components/ui/card";
import { Flame, BarChart3, Clock, DollarSign, Users2 } from "lucide-react";

const problems = [
  {
    icon: Flame,
    title: "Clientes perdidos por falta de follow-up",
    description: "Leads esquecem de você quando não há acompanhamento estruturado"
  },
  {
    icon: BarChart3,
    title: "Dados espalhados em várias planilhas",
    description: "Informações críticas perdidas entre ferramentas desconectadas"
  },
  {
    icon: Clock,
    title: "Perda de prazo em posts e campanhas",
    description: "Ausência de sistema centralizado gera atrasos e retrabalho"
  },
  {
    icon: DollarSign,
    title: "Dificuldade em controlar financeiro",
    description: "Falta de visibilidade clara sobre receitas e despesas"
  },
  {
    icon: Users2,
    title: "Equipe desorganizada e improdutiva",
    description: "Colaboração ineficiente reduz a produtividade do time"
  }
];

export function ProblemSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Cansado de perder clientes por desorganização?
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Pare de usar 10 planilhas diferentes para gerenciar sua agência
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {problems.map((problem, index) => (
            <Card 
              key={index} 
              className="border-destructive/20 hover:border-destructive/40 transition-all hover:scale-105 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <problem.icon className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="font-semibold text-lg">{problem.title}</h3>
                <p className="text-sm text-muted-foreground">{problem.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
