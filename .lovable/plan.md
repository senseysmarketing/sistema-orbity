

# Stripe com Valor Personalizado por Agencia

## Situacao Atual
- O `CreateAgencyDialog` ja salva `monthly_value` na tabela `agencies`
- O `create-checkout` usa um `priceId` fixo (de planos pre-definidos na tabela `subscription_plans`)
- O `check-subscription` busca por email no Stripe e sincroniza com `agency_subscriptions` local
- Nao existe webhook do Stripe

## Problema
O modelo atual usa precos fixos do Stripe (`price_abc123`). Com valores negociados por agencia, cada agencia precisa de um preco Stripe unico.

## Solucao: Preco Dinamico no Stripe

Sim, e perfeitamente possivel. O Stripe suporta criar precos (Prices) on-the-fly via API. O fluxo sera:

```text
Master cadastra agencia com valor negociado (ex: R$ 1.497)
        │
        ▼
Dono registra via link de convite → Faz login
        │
        ▼
Sistema detecta: sem pagamento ativo → Redireciona para pagamento
        │
        ▼
Edge function cria Product + Price no Stripe com o valor da agencia
        │
        ▼
Checkout session criada → Dono paga
        │
        ▼
check-subscription detecta pagamento → Sincroniza localmente
```

## Arquivos a Modificar

### 1. `supabase/functions/create-checkout/index.ts`
- Aceitar `agencyId` no body (alem de ou ao inves de `priceId`)
- Se `agencyId` fornecido e sem `priceId`:
  - Buscar `monthly_value` da agencia
  - Criar um Stripe Product (ou reusar existente via metadata `agency_id`)
  - Criar um Stripe Price recorrente mensal com o valor
  - Salvar `stripe_price_id` e `stripe_product_id` na tabela `agencies` (novas colunas)
  - Usar esse priceId no checkout
- Manter compatibilidade com `priceId` fixo para fluxos antigos

### 2. `supabase/functions/check-subscription/index.ts`
- Apos sincronizar subscription, tambem atualizar `stripe_customer_id` e `stripe_subscription_id` na tabela `agencies` para referencia futura
- Logica ja funciona: busca por email → encontra subscription → sincroniza. Sem mudancas grandes.

### 3. `src/components/payment/PaymentMiddlewareWrapper.tsx`
- Adicionar bypass para rota `/register`
- Quando usuario logado sem subscription ativa e nao e master: ao inves de bloquear, redirecionar para uma tela de pagamento obrigatorio

### 4. `src/components/payment/BlockedAccessScreen.tsx`
- Adicionar botao "Realizar Pagamento" que chama `create-checkout` passando o `agencyId` do usuario
- Diferenciar entre: (a) primeiro acesso sem pagamento → mostrar botao de pagar, (b) inadimplente → mostrar mensagem atual

### 5. `src/hooks/useSubscription.tsx`
- Atualizar `createCheckout` para aceitar `agencyId` como alternativa a `priceId`

### 6. Migration SQL
```sql
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
```

## Detalhes Tecnicos

### Criacao de Preco Dinamico no `create-checkout`:
```ts
// Buscar ou criar produto
let product;
const existingProducts = await stripe.products.search({
  query: `metadata['agency_id']:'${agencyId}'`
});
if (existingProducts.data.length > 0) {
  product = existingProducts.data[0];
} else {
  product = await stripe.products.create({
    name: `Assinatura - ${agencyName}`,
    metadata: { agency_id: agencyId }
  });
}

// Criar preco recorrente
const price = await stripe.prices.create({
  product: product.id,
  unit_amount: monthlyValue * 100, // centavos
  currency: 'brl',
  recurring: { interval: 'month' }
});
```

### Fluxo de Primeiro Acesso
O `PaymentMiddlewareWrapper` detecta `subscription_status === 'none'` ou `pending_payment` e exibe a `BlockedAccessScreen` com CTA de pagamento. O botao chama `create-checkout` com o `agencyId`, gerando o checkout personalizado.

