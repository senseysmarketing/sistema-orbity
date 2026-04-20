

# Trial local — exibir CTA "Assinar Agora" + alinhar status

## Diagnóstico
O `check-subscription` em trial cai no `returnLocalSubscription`, que devolve:
- `subscribed: false`
- `subscription_status: 'trial'` (valor da tabela `agency_subscriptions`, **não** `'trialing'` do Stripe)
- `plan_name: 'Orbity - Acesso Completo (Trial)'`

Em `SubscriptionDetails.tsx`:
- O badge cai no `default` → mostra **"Inativa"**.
- A flag `isTrialing` checa apenas `'trialing'` → bloco de CTA não renderiza.
- O fallback "sem assinatura" exige `!planName` → também não renderiza (plano existe).
- Resultado: usuário em trial vê "Inativa" e **nenhum botão** para assinar antecipadamente.

## Correção (apenas frontend, sem migration)

### 1. `src/components/subscription/SubscriptionDetails.tsx`
Tratar `'trial'` (local) como equivalente a `'trialing'` (Stripe):

```ts
const isTrialing = status === 'trialing' || status === 'trial';
```

E no `getStatusBadge`, adicionar case `'trial'` com o mesmo visual azul de "Período de Teste":
```ts
case 'trialing':
case 'trial':
  return <Badge className="bg-blue-500 hover:bg-blue-500 text-white">Período de Teste</Badge>;
```

### 2. Refinar copy do bloco de trial
Atualizar o card azul de trial para deixar explícito que **assinar agora não interrompe o trial**, mas garante continuidade:

> "Você está no período de teste gratuito. Assine agora para garantir acesso contínuo ao Orbity após o término — sem precisar esperar os 7 dias."

CTA permanece: **"Escolher Plano e Assinar"** → abre `ManageSubscriptionDialog` em `mode="upgrade"` (já existente), que reaproveita o cliente Stripe por email no `create-checkout`.

### 3. (Opcional) `src/components/subscription/SubscriptionStatus.tsx`
Aplicar o mesmo alias `'trial' | 'trialing'` em `getStatusText`, `getStatusColor` e `isSubscriptionActive` para consistência onde quer que esse componente seja usado.

## Garantias
| # | Garantia |
|---|---|
| 1 | Trial local exibe badge azul "Período de Teste", não mais "Inativa". |
| 2 | Botão "Escolher Plano e Assinar" sempre visível durante o trial. |
| 3 | Após 7 dias sem assinatura, o `BlockedAccessScreen` (Master Enforcement) continua barrando o acesso normalmente — sem mudança nessa lógica. |
| 4 | Sem mudanças em edges, schema ou Stripe. |

## Ficheiros alterados
- `src/components/subscription/SubscriptionDetails.tsx`
- `src/components/subscription/SubscriptionStatus.tsx` (opcional, alinhamento)

Sem migrations. Sem novas secrets. Sem mudança em edge functions.

