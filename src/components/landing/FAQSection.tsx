import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle } from "lucide-react";

const faqs = [
  {
    question: "Como funciona o processo de consultoria?",
    answer: "Após preencher a aplicação, nossa equipe analisa o perfil da sua agência e entra em contato via WhatsApp para agendar uma demonstração personalizada. Na call, desenhamos juntos a melhor solução para sua operação."
  },
  {
    question: "Por que o Orbity não tem preço fixo no site?",
    answer: "Cada agência tem necessidades únicas. O investimento é calculado com base no número de clientes, usuários e módulos necessários, garantindo que você pague apenas pelo que realmente precisa."
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
    question: "Vocês ajudam na migração de dados?",
    answer: "Sim! Nossa equipe cuida de toda a migração de dados de planilhas e outras ferramentas, garantindo uma transição suave e sem perda de informações."
  }
];

interface FAQSectionProps {
  onOpenApplication?: () => void;
}

export function FAQSection({ onOpenApplication }: FAQSectionProps) {
  const openWhatsApp = () => {
    const phoneNumber = "551631841908";
    const message = "Olá! Tenho uma dúvida sobre a Orbity.";
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <section className="py-20">
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
            <Button size="lg" className="bg-[#1c102f] hover:bg-[#1c102f]/90 text-white" onClick={onOpenApplication}>
              Aplicar para Consultoria
              <ArrowRight className="ml-2 h-5 w-5" />
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
