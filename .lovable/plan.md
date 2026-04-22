

# Eliminar flicker "Ative sua Assinatura" antes de "Trial Expirou"

## Diagnóstico

`PaymentMiddlewareWrapper` espera apenas `loading` do `usePaymentMiddleware`, mas ignora o `loading` do `useSubscription`. Como `currentSubscription` começa como `null` e a edge `check-subscription` leva ~1s para responder, a sequência é:

1. T=0: `paymentStatus.loading=false`, mas `currentSubscription=null` → `subStatus=undefined` → `isFirstAccessFlag=true` → renderiza **"Ative sua Assinatura"** (cinza).
2. T=~1s: `check-subscription` resolve → `subStatus='trial_expired'` → re-renderiza **"Seu Período de Teste Expirou!"** (vermelho).

## Correção

### `src/components/payment/PaymentMiddlewareWrapper.tsx`
1. Importar `loading` do `useSubscription` como `subscriptionLoading`.
2. Estender a condição do spinner: `if ((loading || subscriptionLoading) && !forceAllow) → spinner`.
3. Adicional: só decidir `isFirstAccessFlag` quando `currentSubscription !== null` (defensivo). Se `currentSubscription` ainda é `null` após loading, não bloquear como first_access — deixar o fluxo normal de `paymentStatus.isValid` decidir.

```ts
const { currentSubscription, loading: subscriptionLoading } = useSubscription();
...
if ((loading || subscriptionLoading) && !forceAllow) { /* spinner */ }
...
const isFirstAccessFlag = currentSubscription !== null && 
  (!subStatus || subStatus === 'none' || subStatus === 'pending_payment');
```

O `forceAllow` de 15s segue como salvaguarda contra travamento da edge.

## Garantias

| # | Garantia |
|---|---|
| 1 | Tela cinza intermediária some — usuário vê direto a tela vermelha correta. |
| 2 | Spinner é estendido por no máximo ~1s (tempo da edge), com fallback de 15s preservado. |
| 3 | Demais cenários (suspended, past_due, first_access real) continuam funcionando. |

## Ficheiros alterados
- `src/components/payment/PaymentMiddlewareWrapper.tsx`

