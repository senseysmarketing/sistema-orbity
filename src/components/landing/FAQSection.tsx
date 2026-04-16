import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

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

export function FAQSection() {
  const openWhatsApp = () => {
    const phoneNumber = "5516994481535";
    const message = "Olá! Tenho uma dúvida sobre a Orbity.";
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <section id="faq" className="bg-white py-24">
      <div className="grid lg:grid-cols-12 gap-12 lg:gap-24 max-w-7xl mx-auto px-4">
        {/* Coluna Esquerda - Sticky */}
        <aside className="lg:col-span-4 lg:sticky lg:top-32 h-fit">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-lg text-slate-500 mb-10">
            Tudo o que precisa de saber sobre o Orbity.
          </p>

          <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50">
            <p className="font-semibold text-slate-900 mb-1">Ainda tem dúvidas?</p>
            <p className="text-sm text-slate-500 mb-4">
              A nossa equipa está pronta para ajudar.
            </p>
            <Button variant="outline" className="w-full" onClick={openWhatsApp}>
              <MessageCircle className="mr-2 h-4 w-4" />
              Falar com Especialista
            </Button>
          </div>
        </aside>

        {/* Coluna Direita - Accordion */}
        <div className="lg:col-span-8">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-slate-50 border border-slate-100 rounded-2xl px-6 overflow-hidden border-b-0 data-[state=open]:bg-white data-[state=open]:shadow-md data-[state=open]:border-purple-500/20 data-[state=open]:ring-1 data-[state=open]:ring-purple-500/10 transition-all duration-300"
              >
                <AccordionTrigger className="font-semibold text-slate-900 hover:no-underline [&>svg]:transition-transform [&>svg]:duration-300">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed">
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
