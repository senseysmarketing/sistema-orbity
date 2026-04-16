

# Ajustes Cirúrgicos no Meta Pixel — Implementação

## Resumo
Três edições cirúrgicas para corrigir valores zerados no Purchase, adicionar trackLead na Demo e trackCompleteRegistration no Onboarding.

## Verificação de Guardrails
- `trackCompleteRegistration` — **existe** em `src/lib/metaPixel.ts` (linha 119). Importação segura.
- `trackLead` — **existe** em `src/lib/metaPixel.ts` (linha 52). Importação segura.
- Ambas as funções serão importadas pelo nome exato exportado.

## Alterações

### 1. `src/components/landing/DemoSchedulingModal.tsx`
- **Importar** `trackLead` de `@/lib/metaPixel` (linha 1-10)
- **Inserir** chamada após linha 103 (depois do bloco catch do webhook), antes de `setStep(3)`:
```typescript
trackLead({
  content_name: 'Agendamento de Demonstração',
  content_category: 'Reunião',
});
```

### 2. `src/pages/SubscriptionSuccess.tsx`
- Calcular `planPrice` a partir de `planSlug` antes de cada `trackPurchase`:
  - No bloco onboarding (linha 33): `const planPrice = planSlug === 'orbity_annual' ? 3564 : 397;`
  - Substituir `value: 0` por `value: planPrice`, remover `content_type`
- No bloco regular (linha 58): manter `value: 397` como default
- Payload exato: `trackPurchase({ value: planPrice, currency: 'BRL', content_name: planSlug || 'subscription' })`

### 3. `src/components/onboarding/ConfirmationStep.tsx`
- **Importar** `trackCompleteRegistration` de `@/lib/metaPixel` (adicionar à importação existente do `trackViewContent`)
- Na `handleSubmit` (linha 45-51), após `submitOnboarding()` retornar `success`:
```typescript
if (success) {
  const contentName = flow === 'trial' ? 'Trial 7 Dias'
    : flow === 'direct_annual' ? 'Orbity Anual' : 'Orbity Mensal';
  trackCompleteRegistration({ content_name: contentName, currency: 'BRL' });
  if (flow === 'trial') navigate('/welcome');
}
```

## Ficheiros alterados
1. `src/components/landing/DemoSchedulingModal.tsx` — +trackLead
2. `src/pages/SubscriptionSuccess.tsx` — valor real no Purchase
3. `src/components/onboarding/ConfirmationStep.tsx` — +trackCompleteRegistration

