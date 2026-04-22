

# Correção crítica — Seleção determinística da agência ativa para usuários multi-agência

## Diagnóstico final (não é bug do Salomão isoladamente)

O usuário Salomão pertence a **duas agências**:

| Agência | Role | Subscription |
|---|---|---|
| Senseys (`7bef1258...`) | member | `active` até 2035 ✅ |
| Salomao (`cf451d1a...`) | owner | `trial` expirado em **2026-01-19** ❌ |

A correção anterior na Edge `check-subscription` está funcionando — quando recebe `agency_id` no body, **respeita** essa agência. O problema agora é **upstream**: o front está enviando o `agency_id` **errado**.

### Causa raiz no `src/hooks/useAgency.tsx`

Linha 122-129 do `fetchUserAgencies()`:
```ts
if (!currentAgency) {
  const firstAgency = agencies[0]; // ← qualquer ordem, sem priorização
  setCurrentAgency(firstAgency);
  localStorage.setItem('currentAgencyId', firstAgency.id); // ← sobrescreve preferência salva!
}
```

Três falhas:
1. `agencies[0]` é a primeira linha que o Postgres devolveu (sem `ORDER BY`) — pode ser Salomao ou Senseys aleatoriamente.
2. **Não verifica `localStorage.currentAgencyId` ANTES de escolher** — sobrescreve a preferência.
3. **Não prioriza agência com assinatura ativa**, então mesmo que ele seja `member` da Senseys (a "boa") com `active`, pode acabar selecionando "Salomao" (trial expirado) só porque é `owner` lá ou porque foi criada depois.

O `useEffect` da linha 296 que tentaria restaurar do localStorage **roda tarde demais** (depois do `setCurrentAgency` inicial), criando race condition. Resultado: `useSubscription` invoca `check-subscription` com o `agency_id` da Salomao, a Edge devolve corretamente `trial_expired` daquela agência, e o middleware bloqueia.

A função SQL `get_user_agency_id()` já foi corrigida com a mesma priorização — falta replicar essa lógica no front.

## Correção

### 1. `src/hooks/useAgency.tsx` — seleção determinística da agência inicial

Reescrever o bloco de auto-seleção (linhas 122-130) para seguir esta ordem:

1. **Restaurar `localStorage.currentAgencyId`** se ela ainda pertence ao usuário.
2. Senão, **agência com subscription ativa** (`active`/`trial`/`trialing`/`past_due` **com `trial_end > now()`** se for trial) + role admin/owner.
3. Senão, agência com subscription ativa (qualquer role).
4. Senão, role `owner`/`admin` (mais antiga).
5. Fallback: agência mais antiga.

Mudanças concretas:
- Carregar subscriptions junto com `agency_users` (single round-trip) ou fazer um `select` adicional em `agency_subscriptions` com os IDs das agências do usuário.
- Aplicar a função de priorização **antes** do `setCurrentAgency`.
- Remover/eliminar a race condition do `useEffect` de "restore from localStorage" (linha 295-303) — incorporar a restauração no fluxo principal.

Pseudocódigo:
```ts
const pickInitialAgency = (userAgencies, subs, savedId) => {
  // 1) Saved preference (if still valid)
  if (savedId && userAgencies.some(au => au.agency_id === savedId)) {
    return savedId;
  }
  const isSubValid = (s) => 
    s.status === 'active' || 
    (['trial','trialing'].includes(s.status) && s.trial_end && new Date(s.trial_end) > new Date()) ||
    s.status === 'past_due';
  const validIds = new Set(subs.filter(isSubValid).map(s => s.agency_id));
  // 2) Active sub + admin
  const adminWithSub = userAgencies.find(au => 
    validIds.has(au.agency_id) && ['owner','admin'].includes(au.role));
  if (adminWithSub) return adminWithSub.agency_id;
  // 3) Active sub + any role
  const memberWithSub = userAgencies.find(au => validIds.has(au.agency_id));
  if (memberWithSub) return memberWithSub.agency_id;
  // 4) Admin without active sub
  const adminAny = userAgencies.find(au => ['owner','admin'].includes(au.role));
  if (adminAny) return adminAny.agency_id;
  // 5) Oldest
  return userAgencies[0].agency_id;
};
```

### 2. `supabase/functions/check-subscription/index.ts` — alinhar critério de "trial válido"

Pequeno ajuste no auto-select (linhas 92-117) para **excluir trials expirados** do conjunto `activeAgencyIds`. Hoje qualquer `status='trial'` entra como "ativo" mesmo que `trial_end` já tenha passado, o que pode levar à seleção de uma agência morta quando o front não passa `agency_id`. Filtrar com `.gt('trial_end', new Date().toISOString())` para os status `trial`/`trialing`. Sem mudança na assinatura da função.

### 3. (Opcional, defesa em profundidade) Limpar cache `useSubscription` ao trocar agência

Quando o usuário troca de agência via `setActiveAgency`, invalidar o cache de subscription para a agência anterior, garantindo que `checkSubscription` seja chamado para a nova. Já há um `useEffect` em `currentAgency?.id` no `useSubscription`, mas só dispara se o cache **não existe** (linha 363). Forçar `checkSubscription(true)` quando a chave de cache muda evita estados híbridos ao trocar agência manualmente.

### 4. Memória

Atualizar `mem://infrastructure/auth/multi-agency-subscription-detection.md` com:
> Frontend (`useAgency`) também aplica priorização determinística (saved > active sub + admin > active sub > admin > oldest) na **seleção inicial** da agência. Sem essa lógica, o `agency_id` enviado para `check-subscription` pode apontar para uma agência com trial expirado e bloquear indevidamente um usuário com plano ativo em outra agência.

## Por que isso resolve definitivamente

- **Salomão** (Senseys ATIVO + Salomao trial expirado) → `useAgency` agora escolhe **Senseys** (active sub vence trial expirado) → Edge recebe `agency_id=7bef1258...` → devolve `subscribed=true` → middleware libera. ✅
- Se Salomão **trocar manualmente** para a agência "Salomao", o `setActiveAgency` salva no localStorage, próximo refresh restaura corretamente, Edge devolve `trial_expired` para essa agência → middleware bloqueia (comportamento esperado). ✅
- Usuários single-agency: comportamento idêntico. ✅
- Outros usuários multi-agência com problema similar: **resolvido sistemicamente**.

## Resposta direta ao "é problema do Salomao especificamente?"

**Não.** O bug é estrutural: qualquer usuário com 2+ agências, onde a "errada" aparecer primeiro na resposta do Postgres, sofreria o mesmo bloqueio. O caso ficou visível com o Salomão porque o nome dele coincide com o nome de uma das agências, mas isso é coincidência — a falha é de **ordenação não-determinística no front** combinada com **trial expirado** sendo tratado como sub válida pela Edge no fallback.

## Ficheiros alterados

- `src/hooks/useAgency.tsx` — função `pickInitialAgency` + remoção da race condition do restore localStorage.
- `supabase/functions/check-subscription/index.ts` — filtrar trials expirados no auto-select.
- `mem://infrastructure/auth/multi-agency-subscription-detection.md` — adicionar regra do front.

## Sem mudanças

- `PaymentMiddlewareWrapper`, `useSubscription` (exceto invalidação opcional de cache), `BlockedAccessScreen`, RLS, migrations SQL.

