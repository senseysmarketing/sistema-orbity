

# Refatorar Card de Assinatura com Travas de Seguranca

## Resumo

Corrigir bug do "0", adicionar suporte a `trialing`, cronometro de trial com fallback seguro, CTA de upgrade, e refatorar o dialog de planos para exibir apenas Orbity Mensal/Anual.

## Alteracoes

### 1. `src/hooks/useSubscription.tsx`

Adicionar `trial_end?: string` a interface `SubscriptionStatus` (linha 28-36). O campo ja e retornado pelo edge function `check-subscription` como `trial_end` (confirmado no codigo).

### 2. `src/components/subscription/SubscriptionDetails.tsx`

- **Bug do "0"**: Linha ~119, trocar `{currentAgency?.monthly_value && (` por `{(currentAgency?.monthly_value ?? 0) > 0 && (`
- **Badges**: Adicionar caso `trialing` → Badge azul "Periodo de Teste (Ativo)"; `past_due` → vermelho "Pagamento Atrasado"; `canceled` → cinza "Inativo"
- **Cronometro**: Se `trialing`, exibir "Valido ate [data]" + "Faltam X dias" usando `Math.max(0, differenceInDays(...))`. Se 0 dias, exibir "Expira hoje"
- **CTA**: Se `trialing`/`past_due`/`canceled`, adicionar Separator + texto motivacional + botao "Escolher Plano e Assinar" que abre `ManageSubscriptionDialog`
- Expandir `isSubscriptionActive` para incluir `trialing`

### 3. `src/components/subscription/SubscriptionStatus.tsx`

Mesmas correcoes de badges para `trialing`, `past_due`, `canceled`.

### 4. `src/components/subscription/ManageSubscriptionDialog.tsx`

Refatoracao critica:
- Filtrar `plans` para exibir APENAS slugs `orbity_monthly` e `orbity_annual` (remover planos legados)
- Exibir cards com: "Orbity Mensal R$ 397/mes" e "Orbity Anual R$ 297/mes (cobrado anualmente R$ 3.564)"
- O botao de checkout deve usar `stripe_price_id_monthly` para mensal e `stripe_price_id_yearly` para anual
- Remover mencoes a planos Basic/Professional/Enterprise/Senseys

## Detalhes tecnicos

- `trial_end` confirmado como nome exato retornado pelo edge function (linha 209 de `check-subscription/index.ts`)
- Importar `differenceInDays` de `date-fns` e `Separator` de `@/components/ui/separator`
- Cronometro usa `Math.max(0, differenceInDays(new Date(trial_end), new Date()))` para nunca exibir negativo
- O filtro de planos no dialog usa `['orbity_monthly', 'orbity_annual'].includes(plan.slug)`

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useSubscription.tsx` | `trial_end` na interface |
| `src/components/subscription/SubscriptionDetails.tsx` | Bug fix, badges, cronometro, CTA |
| `src/components/subscription/SubscriptionStatus.tsx` | Badges atualizados |
| `src/components/subscription/ManageSubscriptionDialog.tsx` | Filtrar apenas planos Orbity |

