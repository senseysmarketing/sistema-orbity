

# Ajustes na integração Stripe da Agência

Alinhar a UX/lógica do Stripe ao padrão Asaas/Conexa: **gateway é escolhido na hora de gerar a cobrança**, não há "principal".

## 1. `src/components/settings/StripeIntegration.tsx`

- **Remover** o seletor "Gateway principal de cobrança" (Asaas vs Stripe) — desnecessário.
- **Adicionar** Master Switch `Habilitar Stripe` (idêntico ao do Asaas):
  - Card com `Switch`, label "Habilitar Stripe" + descrição "Disponibiliza Stripe como opção de faturamento para clientes".
  - Estado `stripeEnabled` derivado de `active_payment_gateway === 'stripe'` (reutilizando a coluna como flag de "habilitado/desabilitado", já que o switch substitui o seletor).
- **Badge** no header: "Conectado" (verde) quando `hasKey && stripeEnabled`, senão "Desconectado". Mesma lógica visual do Asaas.
- **Alert "Como configurar na Stripe"**: refatorar para usar o mesmo padrão visual do Asaas — `bg-blue-50/50 border-blue-200 dark:bg-blue-950/30`, ícone `Info` azul, título `text-blue-800 dark:text-blue-300`, lista numerada com `leading-relaxed`, eventos do webhook listados com `CheckCircle2 emerald` + descrição em texto (não chips).
- Botão final: "Salvar e Conectar" (mesmo label do Asaas).
- Lógica de `handleSave` atualiza `active_payment_gateway` para `'stripe'` se switch ON, ou `'asaas'` (default) se OFF — tratando a coluna como flag binária de "Stripe habilitado".

## 2. `src/hooks/useCreatePayment.ts`

- **Reverter** o roteamento automático baseado em `active_payment_gateway`. O hook deve continuar respeitando o `billing_type` escolhido no formulário de criação de cobrança (Asaas/Conexa/Manual/Stripe).
- Adicionar suporte a `billing_type === 'stripe'` → invoca `create-agency-stripe-charge` (mantém a edge function como está).
- Demais billing types seguem o fluxo atual via `create-gateway-charge`.

## 3. UI de criação de cobrança (formulário "Gerar cobrança")

- No seletor de método/gateway (onde já aparecem Asaas/Conexa/Manual), **adicionar opção "Stripe"** quando a agência tem `stripe_secret_key` configurada e `active_payment_gateway === 'stripe'` (flag de habilitado).
- Hook `usePaymentGateway`: retornar flag `stripe_enabled` derivada (`stripe_secret_key != null && active_payment_gateway === 'stripe'`) para o seletor exibir/ocultar a opção.

## Sem mudanças

- Edge functions (`create-agency-stripe-charge`, `stripe-agency-webhook`, `test-agency-stripe`) — preservadas.
- Migration / schema — preservada (a coluna `active_payment_gateway` agora atua como flag de habilitação do Stripe).
- `AsaasIntegration.tsx`, `ConexaIntegration.tsx` — preservados.
- Stripe Master (assinatura Orbity) — intocável.

## Arquivos editados

- `src/components/settings/StripeIntegration.tsx` — remover seletor, adicionar switch, refatorar Alert no padrão azul.
- `src/hooks/useCreatePayment.ts` — roteamento por `billing_type`, não por `active_payment_gateway`.
- `src/hooks/usePaymentGateway.tsx` — flag `stripe_enabled`.
- Componente do formulário de criação de cobrança — adicionar opção Stripe no seletor de método.

