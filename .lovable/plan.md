

# Webhook Condicional — Disparo apenas para Trial

## Resumo
Duas alterações: (1) passar `flow` no body do frontend, (2) condicionar o webhook na Edge Function.

## 1. Frontend — `src/hooks/useOnboarding.tsx`

A variável `flow` já está no escopo do `OnboardingProvider` (recebida como prop). Basta adicioná-la ao body na linha 230:

```typescript
body: {
  companyData: onboardingData.companyData,
  planSlug: onboardingData.planSlug,
  adminUser: onboardingData.adminUser,
  flow: flow || 'trial'
}
```

Não é necessário ler da URL — `flow` já é uma variável do closure.

## 2. Edge Function — `supabase/functions/agency-onboarding/index.ts`

**Interface** (linha 14-27): Adicionar `flow?: string;` à `OnboardingRequest`.

**Extração** (linha 43): Incluir `flow` no destructuring.

**Log inicial** (linha 45-49): Adicionar `flow` ao log.

**Step 8** (linhas 227-274): Envolver em condicional:
```typescript
if (flow === 'trial' || !flow) {
  // bloco webhook existente
  // + adicionar flow: flow || 'trial' ao webhookPayload
} else {
  logStep("Webhook ignorado - Fluxo de assinatura direta", { flow });
}
```

**Deploy** da edge function após alteração.

## Arquivos alterados
1. `src/hooks/useOnboarding.tsx` — adiciona `flow` ao body
2. `supabase/functions/agency-onboarding/index.ts` — condicional + payload atualizado
3. Deploy da edge function

