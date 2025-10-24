import { PricingCards } from "@/components/subscription/PricingCards";

export function PricingSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Planos que crescem com sua agência
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Escolha o plano ideal para o tamanho da sua operação
          </p>
        </div>

        <PricingCards />

        <div className="text-center mt-12 space-y-4">
          <p className="text-sm text-muted-foreground">
            ✓ 14 dias de teste grátis • ✓ Sem cartão de crédito • ✓ Cancele quando quiser
          </p>
          <p className="text-sm text-muted-foreground">
            🔒 Pagamento seguro com criptografia SSL
          </p>
        </div>
      </div>
    </section>
  );
}
