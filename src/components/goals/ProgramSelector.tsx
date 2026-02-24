import { Trophy, Target, Zap, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProgramSelectorProps {
  onSelect: (type: string) => void;
}

const programs = [
  {
    type: "ppr",
    title: "Participação nos Resultados (PPR)",
    description:
      "A agência define um percentual do lucro líquido como pool de bônus. A distribuição depende da nota de cada colaborador no Scorecard. Só paga se houver lucro.",
    icon: Trophy,
    available: true,
    highlight: "Mais seguro para o caixa",
  },
  {
    type: "salary_multiplier",
    title: "Multiplicador de Salário",
    description:
      "Cada colaborador pode ganhar até X salários extras por período com base na nota do Scorecard. Fácil de entender e previsível.",
    icon: Target,
    available: false,
    highlight: "Fácil compreensão",
  },
  {
    type: "spot_bonus",
    title: "Bônus Fixo por Meta (Spot Bonus)",
    description:
      "Valor fixo atrelado a objetivos específicos ou nota final do mês. Ideal para remuneração híbrida no time de tráfego.",
    icon: Zap,
    available: false,
    highlight: "Pagamentos mensais",
  },
];

export function ProgramSelector({ onSelect }: ProgramSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {programs.map((prog) => (
        <Card
          key={prog.type}
          className={`relative transition-all ${
            prog.available
              ? "hover:shadow-lg hover:border-primary/50 cursor-pointer"
              : "opacity-60"
          }`}
        >
          {!prog.available && (
            <Badge variant="secondary" className="absolute top-3 right-3">
              <Lock className="h-3 w-3 mr-1" />
              Em breve
            </Badge>
          )}
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <prog.icon className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-lg">{prog.title}</CardTitle>
            <Badge variant="outline" className="mx-auto mt-1 text-xs">
              {prog.highlight}
            </Badge>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <CardDescription className="text-sm">{prog.description}</CardDescription>
            <Button
              className="w-full"
              disabled={!prog.available}
              onClick={() => onSelect(prog.type)}
            >
              {prog.available ? "Selecionar" : "Indisponível"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
