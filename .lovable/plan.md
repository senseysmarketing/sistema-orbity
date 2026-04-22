

# Trial Expirado — Mostrar Tela de Assinatura (não de Suspensão)

## Diagnóstico (caso real: gabriel@gmail.com)

Estado no banco:
- `agency_subscriptions.status = 'trial'`
- `trial_end = 2026-04-20` (já passou)
- `stripe_subscription_id = NULL`, `current_period_end = NULL`
- `agencies.is_active = true`

Fluxo atual em `PaymentMiddlewareWrapper.tsx`:

```ts
const subscriptionActive = currentSubscription?.subscribed && [...]
const agencySuspended = currentAgency?.is_active === false;        // false
const isPastDueBlocked = status==='past_due' && diffDays > 5;       // false
const isBlocked = agencySuspended || isPastDueBlocked || 
                  (!paymentStatus?.isValid && !isSuperAdmin && !subscriptionActive);
// paymentStatus.isValid = false (RPC retorna false porque trial_end < now)
// → isBlocked = TRUE → reason='payment'
```

Em `BlockedAccessScreen`, o cálculo de qual tela renderizar:

```ts
const isTrialExpired = subscription_end && new Date(subscription_end) <= new Date();
// subscription_end vem NULL (trial não tem) → isTrialExpired = false
const isFirstAccess = status === 'none' || status === 'pending_payment';
// status === 'trial' → isFirstAccess = false
// → cai no "else": "Acesso suspenso. Pendência financeira > 5 dias"
```

**Dois bugs combinados**:
1. `BlockedAccessScreen` não tem ramo para `subscription_status === 'trial'` quando trial expirou — usa `subscription_end` que é nulo durante o trial. Resultado: mostra mensagem errada de "pendência financeira > 5 dias".
2. `check-subscription` retorna `subscribed:false, subscription_status:'trial'` para trials expirados sem distinguir de trials ativos. O frontend não consegue diferenciar.

## Correção (3 ajustes cirúrgicos)

### 1. `supabase/functions/check-subscription/index.ts`
No bloco `returnLocalSubscription`, quando `status === 'trial'`, calcular se expirou e marcar explicitamente:

```ts
if (localSubscription.status === 'trial') {
  const trialExpired = localSubscription.trial_end && 
    new Date(localSubscription.trial_end) <= new Date();
  return Response({
    subscribed: false,
    subscription_status: trialExpired ? 'trial_expired' : 'trial',
    trial_end: localSubscription.trial_end,
    subscription_end: localSubscription.current_period_end,
    plan_name: plan.name,
    ...
  });
}
```

### 2. `src/components/payment/BlockedAccessScreen.tsx`
Reescrever a detecção de cenário para considerar trial expirado corretamente:

```ts
const status = currentSubscription?.subscription_status;
const isTrialExpired = status === 'trial_expired' || 
  (status === 'trial' && currentSubscription?.trial_end && 
   new Date(currentSubscription.trial_end) <= new Date());
const isFirstAccess = !status || status === 'none' || status === 'pending_payment';
const isPastDue = status === 'past_due';
const isSuspended = reason === 'suspended';
```

Adicionar ramo dedicado para "trial expirado": copy "Seu período de teste de 7 dias terminou! Escolha um plano para continuar usando o Orbity" + botão **Assinar Agora** (já existe a lógica `(isFirstAccess || isTrialExpired)`).

### 3. `src/components/payment/PaymentMiddlewareWrapper.tsx`
Refinar o cálculo de `reason` para distinguir 3 cenários (a tela já suporta os ramos):

```ts
const status = currentSubscription?.subscription_status;
const isTrialExpiredFlag = status === 'trial_expired' || 
  (status === 'trial' && currentSubscription?.trial_end && 
   new Date(currentSubscription.trial_end) <= new Date());

if (isBlocked) {
  let reason: 'suspended' | 'payment' | 'trial_expired' = 'payment';
  if (agencySuspended) reason = 'suspended';
  else if (isTrialExpiredFlag) reason = 'trial_expired';
  else if (isPastDueBlocked) reason = 'payment';
  return <BlockedAccessScreen reason={reason} />;
}
```

E ampliar o tipo da prop `reason` em `BlockedAccessScreen` para `'suspended' | 'payment' | 'trial_expired' | 'first_access'`.

## Matriz resultante

| Estado | `reason` | Tela mostrada |
|---|---|---|
| `is_active=false` na agência | `suspended` | "Acesso Suspenso pelo Admin" + WhatsApp |
| Trial expirado, sem assinatura Stripe | `trial_expired` | "Seu período de teste expirou" + **Assinar Agora** |
| `past_due` há > 5 dias | `payment` | "Pendência financeira > 5 dias" + WhatsApp |
| Sem subscription registrada (`none`/`pending_payment`) | `first_access` | "Ative sua Assinatura" + **Assinar Agora** |

## Garantias

| # | Garantia |
|---|---|
| 1 | Trial expirado sem Stripe sub passa a mostrar a tela de assinatura (com plan selection), não a de suspensão. |
| 2 | Suspensão manual (`is_active=false`) continua mostrando WhatsApp de suporte. |
| 3 | Inadimplência real (`past_due` > 5 dias) mantém a mensagem financeira. |
| 4 | First access (registro novo sem subscription) continua intacto. |
| 5 | Sem migrations, sem mudança em RLS, sem mudança no fluxo de checkout. |

## Ficheiros alterados
- `supabase/functions/check-subscription/index.ts` — emitir `trial_expired` quando trial venceu.
- `src/components/payment/BlockedAccessScreen.tsx` — detectar trial expirado pelo `trial_end` e novo `reason`.
- `src/components/payment/PaymentMiddlewareWrapper.tsx` — passar `reason='trial_expired'` quando aplicável.

