

# Correção crítica — Detecção de assinatura para usuários multi-agência

## Causa raiz (confirmada via DB + logs)

O usuário Salomão (`b9b058c9-...`) pertence a **duas agências**:

| Agência | Role | Subscription |
|---|---|---|
| Senseys - Marketing Imobiliario (`7bef1258...`) | member | **active** até 2035 ✅ |
| Salomao (`cf451d1a...`) | owner | **inexistente** ❌ |

Quando o front invoca `check-subscription`, a Edge faz:
```ts
.from('agency_users').select('agency_id').eq('user_id', user.id).single()
```
Sem ordenação nem filtro pela agência ativa, o Postgres devolve uma linha qualquer — neste caso a agência "Salomao", que não tem `agency_subscriptions`. A Edge responde `{ subscribed: false, subscription_status: 'none' }`, o `PaymentMiddlewareWrapper` interpreta como `first_access` e bloqueia o usuário com a tela "Ative sua Assinatura".

**Confirmado nos logs**: `[CHECK-SUBSCRIPTION] No agency found for user` — mensagem disparada porque `.single()` falhou ao encontrar exatamente 1 linha (existem 2). O front então cai em fallback `{ subscribed: false }`.

O bypass para `member` proposto antes mascararia o sintoma, mas o **bug real é a Edge não respeitar a agência ativa**.

## Correção

### 1. Edge `supabase/functions/check-subscription/index.ts`

- Aceitar `agency_id` opcional no body (`POST` JSON). Quando vier do front, **usar essa** como fonte de verdade.
- Quando não vier, listar **todas** as agências do usuário (sem `.single()`), priorizar nesta ordem:
  1. Agência com `agency_subscriptions.status IN ('active','trial','trialing','past_due')`.
  2. Agência onde o usuário é `owner`/`admin` (mais antiga).
  3. Qualquer outra (mais antiga por `created_at`).
- Trocar `.single()` por `.select('agency_id, role').order('created_at', { ascending: true })` + lógica de priorização acima.
- Manter os retornos `subscribed/subscription_status` como hoje.

### 2. Front `src/hooks/useSubscription.tsx`

- Em `checkSubscription`, passar `body: { agency_id: currentAgency?.id }` na invocação:
  ```ts
  supabase.functions.invoke('check-subscription', {
    body: { agency_id: currentAgency?.id },
    headers: { Authorization: `Bearer ${...}` }
  })
  ```
- Garante que a checagem reflete exatamente a agência atualmente selecionada no `AgencyContext` (já persistida em `localStorage`).

### 3. Função SQL `get_user_agency_id()` (resiliência adicional)

A função hoje usa `LIMIT 1` sem ordenação, problema sistêmico para qualquer usuário multi-agência. Reescrever para:
- Priorizar agência com subscription ativa.
- Em empate, preferir role `owner`/`admin`.
- Fallback: `ORDER BY created_at ASC LIMIT 1`.

Isso protege RPCs como `is_agency_subscription_valid()` e `get_agency_subscription()` que são chamadas pelo `usePaymentMiddleware` e podem sofrer o mesmo problema indiretamente.

## Por que isso resolve sem reabrir falhas

- Salomão na agência Senseys → Edge agora recebe `agency_id=7bef1258...`, encontra subscription `active`, devolve `subscribed: true`.
- Salomão na agência "Salomao" (se trocar) → Edge recebe esse ID, não acha subscription, devolve `first_access` corretamente — comportamento esperado para uma agência sem plano.
- Outros usuários single-agency → comportamento idêntico ao atual (a única agência continua sendo escolhida).
- A trava de fim de trial continua funcionando (ela depende de `subscription_status='trial_expired'` retornado corretamente — que agora acontece para a agência certa).

## Ficheiros alterados

- `supabase/functions/check-subscription/index.ts` — aceita `agency_id` no body; remove `.single()`; lógica de priorização.
- `src/hooks/useSubscription.tsx` — envia `body: { agency_id: currentAgency?.id }` no invoke.
- Migração SQL — reescrita de `get_user_agency_id()` com priorização determinística.

## Sem mudanças

- `PaymentMiddlewareWrapper`, `BlockedAccessScreen`, `useAgency`, RLS policies — intactos.
- Sem mudança de UI.

