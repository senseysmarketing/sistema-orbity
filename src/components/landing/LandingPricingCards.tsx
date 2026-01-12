import { Check, Rocket, Star, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    id: "basic",
    name: "Básico",
    description: "Ideal para pequenas agências",
    price: 97,
    icon: Rocket,
    popular: false,
    buttonText: "Teste Grátis por 7 Dias",
    benefits: [
      "Equipe de até 5 pessoas",
      "Gerencie 10 clientes ativos",
      "Organize até 500 tarefas",
      "CRM completo com 300 leads",
      "Planner de Redes Sociais",
      "Gere até 10 contratos",
    ],
  },
  {
    id: "professional",
    name: "Profissional",
    description: "Para agências em crescimento",
    price: 197,
    icon: Star,
    popular: true,
    buttonText: "Contratar Agora",
    benefits: [
      "Equipe de até 10 pessoas",
      "Gerencie 30 clientes ativos",
      "Organize até 800 tarefas",
      "CRM avançado com 500 leads",
      "Suporte prioritário",
      "Gere até 30 contratos",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Para grandes operações",
    price: 597,
    icon: Building2,
    popular: false,
    buttonText: "Contratar Agora",
    benefits: [
      "Usuários ilimitados",
      "Clientes ilimitados",
      "Tarefas ilimitadas",
      "Leads ilimitados",
      "Contratos ilimitados",
      "Suporte prioritário 24/7",
      "Armazenamento de 1TB",
    ],
  },
];

export function LandingPricingCards() {
  const navigate = useNavigate();

  const handleSelectPlan = () => {
    navigate("/onboarding");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
      {plans.map((plan) => {
        const Icon = plan.icon;
        
        return (
          <Card
            key={plan.id}
            className={`relative flex flex-col transition-all duration-300 hover:shadow-xl ${
              plan.popular
                ? "border-primary border-2 shadow-lg scale-[1.02]"
                : "border-border hover:border-primary/50"
            }`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1">
                Mais Popular
              </Badge>
            )}

            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-3">
                <div className={`p-3 rounded-full ${plan.popular ? "bg-primary/10" : "bg-muted"}`}>
                  <Icon className={`h-6 w-6 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                </div>
              </div>
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">R$ {plan.price}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm">{benefit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-4">
              <Button
                onClick={handleSelectPlan}
                variant={plan.popular ? "default" : "outline"}
                className="w-full"
                size="lg"
              >
                {plan.buttonText}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
