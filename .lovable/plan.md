

# Ajustar Aba de Assinatura nas Configuracoes

## Problema
A aba de assinatura ainda mostra "Plano Atual" e referencias a trial, que nao fazem mais sentido no modelo de pricing dinamico por agencia. O historico de faturas precisa funcionar corretamente com o modelo atual.

## Alteracoes

### 1. `src/components/subscription/SubscriptionDetails.tsx`
- Trocar label "Plano Atual" por "Assinatura" 
- Remover toda logica e UI de trial (`isTrialActive`, bloco azul de "Periodo de Teste Ativo")
- Remover `trial`/`trialing` dos `getStatusColor` e `getStatusText`
- Manter: Status, Proxima Cobranca, botao Gerenciar Assinatura
- Trocar descricao "Informacoes sobre seu plano atual" por "Informacoes sobre sua assinatura"
- Exibir o valor mensal da agencia (`monthly_value`) se disponivel — buscar da tabela `agencies`

### 2. `src/hooks/useSubscription.tsx`
- Remover `trial_end` do `SubscriptionStatus` interface
- Remover referencias a `trial`/`trialing` em `isFeatureAvailable` e logica geral
- No `checkSubscription`, continuar usando `check-subscription` normalmente (ele ja retorna dados corretos do Stripe)

### 3. `supabase/functions/check-subscription/index.ts`
- Na resposta final, continuar retornando `plan_name` (vem da tabela `subscription_plans` corretamente)
- Remover o fallback para `trialing` → `trial` no `syncData.status` (linhas 153) — mapear tudo como `active`
- Na funcao `returnLocalSubscription`, remover logica de `isValidTrial`

### 4. `src/components/subscription/BillingHistory.tsx`
- Sem alteracoes necessarias — o componente ja funciona corretamente buscando da tabela `billing_history` e sincronizando via Stripe
- O `sync-invoices` ja busca pelo `stripe_customer_id` da agencia, que e independente de plano

## Arquivos modificados
- `src/components/subscription/SubscriptionDetails.tsx`
- `src/hooks/useSubscription.tsx`
- `supabase/functions/check-subscription/index.ts`

