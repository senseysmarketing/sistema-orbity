import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, MessageCircle, CalendarDays } from "lucide-react";

const faqs = [
  {
    question: "Quanto custa o Orbity?",
    answer: "O Orbity custa R$ 397/mês no plano mensal ou R$ 297/mês no plano anual (cobrado anualmente por R$ 3.564). Todos os módulos estão inclusos em ambos os planos."
  },
  {
    question: "O teste grátis precisa de cartão de crédito?",
    answer: "Não! Você pode testar o Orbity por 7 dias gratuitamente sem precisar cadastrar nenhum cartão de crédito. Após os 7 dias, basta escolher seu plano para continuar."
  },
  {
    question: "O que acontece quando o trial acaba?",
    answer: "Após os 7 dias de teste, o acesso ao sistema é pausado até que você escolha um plano. Todos os seus dados ficam salvos e disponíveis assim que você assinar."
  },
  {
    question: "Vocês têm integração com outras ferramentas?",
    answer: "Sim! Temos integração nativa com Facebook Ads para gestão de tráfego pago, webhooks para captura de leads, e API aberta para integrações personalizadas."
  },
  {
    question: "Como funciona o suporte?",
    answer: "Todos os clientes contam com onboarding personalizado, suporte prioritário via WhatsApp e acompanhamento contínuo para garantir o sucesso da sua operação."
  },
  {
    question: "Os dados são seguros?",
    answer: "Absolutamente! Utilizamos criptografia SSL, backups diários automáticos, e nossos servidores seguem as normas LGPD. Seus dados estão seguros e são de sua propriedade."
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim! No plano mensal, você pode cancelar a qualquer momento sem multa. No plano anual, o cancelamento encerra a renovação automática ao final do período contratado."
  }
];

interface FAQSectionProps {
  onOpenApplication?: () => void;
  onOpenScheduling?: () => void;
}

export function FAQSection({ onOpenScheduling }: FAQSectionProps) {
  const navigate = useNavigate();

  const openWhatsApp = () => {
    const phoneNumber = "5516994481535";
    const message = "Olá! Tenho uma dúvida sobre a Orbity.";
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <section id="faq" className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Perguntas Frequentes</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Tire suas dúvidas sobre a plataforma</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">Ainda tem dúvidas? Fale conosco!</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-[#1c102f] hover:bg-[#1c102f]/90 text-white" onClick={() => navigate('/onboarding?flow=trial')}>
              Começar Teste Grátis
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={onOpenScheduling}>
              <CalendarDays className="mr-2 h-5 w-5" />
              Agendar Apresentação
            </Button>
            <Button size="lg" variant="outline" onClick={openWhatsApp}>
              Falar no WhatsApp
              <MessageCircle className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
