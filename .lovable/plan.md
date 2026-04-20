

# Atualizar `ManageSubscriptionDialog` — features ilimitadas (sync com Landing)

## Diagnóstico
O dialog ainda mostra "5 usuários / 10 clientes / 500 tarefas" lendo `plan.max_users`, `plan.max_clients`, `plan.max_tasks`. Isso contradiz a memória **Unlimited Resource Model** (R$397/R$3564, sem limites) e o que a Landing (`PricingSection.tsx`) anuncia.

## Mudança (apenas `src/components/subscription/ManageSubscriptionDialog.tsx`)

Substituir a lista dinâmica baseada em `max_*` por uma **lista estática idêntica à da Landing**:

```ts
const PLAN_FEATURES = [
  "Membros ilimitados da equipa",
  "CRM de Vendas & Pipeline",
  "Automação de WhatsApp Multi-instância",
  "Gestor de Redes Sociais com IA",
  "Cobrança Automática (Asaas/Conexa)",
  "Agenda sincronizada com Google Calendar",
  "Onboarding Premium Dedicado",
];
```

E no `<CardContent>` de cada plano, renderizar:
```tsx
{PLAN_FEATURES.map((f) => (
  <div key={f} className="flex items-start gap-2">
    <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
    <span className="text-sm">{f}</span>
  </div>
))}
```

## Remoções
- Bloco de `plan.max_users`, `plan.max_clients`, `plan.max_tasks`.
- Bloco condicional `plan.has_crm` (CRM já está como item permanente).
- Item duplicado "Planner Social Media" (substituído por "Gestor de Redes Sociais com IA").

## Garantias
| # | Garantia |
|---|---|
| 1 | Mesma lista de 7 features da Landing — coerência de marketing. |
| 2 | Reflete o modelo **Unlimited Resource** (sem limites numéricos). |
| 3 | Ambos os cards (Mensal e Anual) mostram exatamente as mesmas features — único diferencial é preço. |
| 4 | Sem mudanças em hook, edge function, schema ou Stripe. |

## Ficheiros alterados
- `src/components/subscription/ManageSubscriptionDialog.tsx`

Sem migrations. Sem novas secrets.

