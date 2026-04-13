

# Corrigir Onboarding: Slugs, Redirect Default e Submit Híbrido

## Resumo

Aplicar 3 correções críticas ao onboarding: slugs diferenciados por ciclo, redirect automático para trial quando flow inválido, e garantir que fluxos diretos não redirecionem ao dashboard.

## Alterações

### 1. `src/hooks/useOnboarding.tsx` — Slugs diferenciados

**Linha 88-93**: Trocar `planSlug: 'basic'` por slugs específicos:
- `flow === 'trial'` → `planSlug: 'orbity_trial'`
- `flow === 'direct_monthly'` → `planSlug: 'orbity_monthly'`
- `flow === 'direct_annual'` → `planSlug: 'orbity_annual'`

**Linha 257/263**: Trocar fallback `'basic'` por `'orbity_trial'` nos tracking calls.

### 2. `src/pages/Onboarding.tsx` — Redirect para trial se flow inválido

No componente `Onboarding`, após calcular `flow`, se o resultado for `'default'` (nenhum param válido), redirecionar automaticamente para `/onboarding?flow=trial` usando `navigate` com `replace: true`. Isso impede acesso ao PlanSelectionStep legado.

```
const flow = useMemo(() => { ... }, [searchParams]);

useEffect(() => {
  if (flow === 'default') {
    navigate('/onboarding?flow=trial', { replace: true });
  }
}, [flow, navigate]);
```

Também ajustar `totalSteps` no OnboardingProvider: como `default` nunca será atingido, o fluxo de 4 steps com PlanSelectionStep fica inacessível.

### 3. `src/components/onboarding/ConfirmationStep.tsx` — UI dinâmica + submit híbrido

Reescrever o componente conforme o plano anterior aprovado (renderização condicional por flow), com estas garantias adicionais:

- **Botão**: `flow === 'trial'` → "Criar Agência e Iniciar Trial" / flows direct → "Ir para Pagamento"
- **handleSubmit**: Já está correto no `useOnboarding` — `submitOnboarding()` chama `initiateCheckout()` nos flows direct e só redireciona ao `/welcome` no trial. O `ConfirmationStep` apenas chama `submitOnboarding()` e navega para `/welcome` **somente se** `success === true` **e** `flow === 'trial'`. Para flows direct, o redirect é feito pelo `window.open` dentro de `initiateCheckout`.

Ajuste no handleSubmit do ConfirmationStep:
```tsx
const handleSubmit = async () => {
  const success = await submitOnboarding();
  if (success && flow === 'trial') {
    navigate('/welcome');
  }
  // direct flows: redirect handled by initiateCheckout (window.open to checkout URL)
};
```

- Remover `getPlanInfo` hardcoded com planos antigos (97/197/597)
- Renderizar bloco "Plano Selecionado" condicionalmente por flow (conforme plano anterior)
- Remover `trackViewContent` com `getPlanInfo` — substituir por valores fixos baseados no flow

### 4. `supabase/functions/onboarding-checkout/index.ts` — Aceitar novos slugs

Verificar se o edge function consegue resolver `orbity_monthly` e `orbity_annual` na tabela `subscription_plans`. Se os slugs não existirem na tabela, será necessária uma migration para atualizar/criar os registros corretos.

## Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useOnboarding.tsx` | Slugs diferenciados por flow |
| `src/pages/Onboarding.tsx` | Redirect default → trial |
| `src/components/onboarding/ConfirmationStep.tsx` | UI dinâmica + navigate condicional |
| Possível migration SQL | Garantir slugs `orbity_monthly`/`orbity_annual` na tabela `subscription_plans` |

