import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const testimonials = [
  {
    name: "Ana Silva",
    role: "CEO",
    company: "Digital Marketing Pro",
    content: "Triplicamos nossa capacidade de atendimento sem aumentar o time. A organização que faltava para escalar.",
    rating: 5,
    initials: "AS"
  },
  {
    name: "Carlos Mendes",
    role: "Fundador",
    company: "Social Ads Agency",
    content: "Nunca mais perdemos um prazo de post ou campanha. O sistema de notificações é perfeito.",
    rating: 5,
    initials: "CM"
  },
  {
    name: "Juliana Costa",
    role: "COO",
    company: "Performance Digital",
    content: "Economizamos 3 horas por dia em tarefas operacionais. O ROI foi imediato.",
    rating: 5,
    initials: "JC"
  }
];

const metrics = [
  { value: "500+", label: "Tarefas concluídas por dia" },
  { value: "95%", label: "Satisfação dos usuários" },
  { value: "3h", label: "Economizadas por dia" }
];

export function TestimonialsSection() {
  const navigate = useNavigate();

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Agências que confiam na gente
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Veja o que nossos clientes dizem sobre a transformação nas suas operações
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-all animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role} • {testimonial.company}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {metrics.map((metric, index) => (
            <div 
              key={index} 
              className="text-center animate-fade-in"
              style={{ animationDelay: `${0.3 + index * 0.1}s` }}
            >
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {metric.value}
              </div>
              <div className="text-muted-foreground">{metric.label}</div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button 
            size="lg" 
            className="bg-[#1c102f] hover:bg-[#1c102f]/90 text-white"
            onClick={() => navigate("/onboarding")}
          >
            Junte-se a Eles
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
