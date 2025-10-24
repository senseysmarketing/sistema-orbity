import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Como funciona o período de teste?",
    answer: "Você tem 14 dias para testar todas as funcionalidades sem precisar informar cartão de crédito. Ao final do período, escolha o plano ideal para continuar usando."
  },
  {
    question: "Posso cancelar a qualquer momento?",
    answer: "Sim! Não há contratos de fidelidade. Você pode cancelar sua assinatura a qualquer momento diretamente pelo painel, e o cancelamento tem efeito imediato."
  },
  {
    question: "Vocês têm integração com outras ferramentas?",
    answer: "Sim! Temos integração nativa com Facebook Ads para gestão de tráfego pago, webhooks para captura de leads, e API aberta para integrações personalizadas."
  },
  {
    question: "Como funciona o suporte?",
    answer: "Oferecemos suporte em português via chat, email e base de conhecimento. Planos Professional e Enterprise têm atendimento prioritário e onboarding personalizado."
  },
  {
    question: "Os dados são seguros?",
    answer: "Absolutamente! Utilizamos criptografia SSL, backups diários automáticos, e nossos servidores seguem as normas LGPD. Seus dados estão seguros e são de sua propriedade."
  },
  {
    question: "Posso importar meus dados de outras plataformas?",
    answer: "Sim! Oferecemos assistência para migração de dados de planilhas e outras ferramentas. Nossa equipe pode ajudar no processo de importação inicial."
  }
];

export function FAQSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Tire suas dúvidas sobre a plataforma
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
