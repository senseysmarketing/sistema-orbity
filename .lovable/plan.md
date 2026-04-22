

# Forecast — Corrigir Detecção de Assinaturas Ativas (3 → todas as reais)

## Diagnóstico

O `is_active` no banco é **por lançamento mensal**, não por grupo. Quando uma nova ocorrência é criada, o lançamento anterior vira `is_active=false`. Exemplo real do banco:

| Assinatura | Lançamento mais recente | `is_active` desse lançamento |
|---|---|---|
| Adobe Pro | 2026-04-05 | **false** ❌ |
| Adveronix | 2026-04-05 | **false** ❌ |
| Caixa Empresa | 2026-04-30 | **false** ❌ |
| Canva Pro | 2026-04-05 | **false** ❌ |

A query atual `is_active=true AND due_date >= hoje-60d` **rejeita esses grupos** porque o lançamento recente está `false`. Só passam grupos onde, por coincidência, o último mês criado ainda está `true` — daí "3 ativas".

A flag `is_active=true` real fica no **registro mestre** (`parent_expense_id IS NULL`). É lá que o usuário pausa/cancela a assinatura inteira na Central de Despesas (mesma lógica que a aba "SaaS Tracker" usa para listar 12+ ativas).

## Correção (somente `useFinancialMetrics.tsx`)

Trocar a estratégia da query `recurringActiveQuery`:

### Passo 1 — Buscar **mestres ativos** (1 query, sem corte temporal nos filhos)
```ts
const { data: masters } = await supabase
  .from('expenses')
  .select('*')
  .eq('agency_id', agencyId)
  .eq('expense_type', 'recorrente')
  .is('parent_expense_id', null)        // ← apenas mestres
  .eq('is_active', true)                 // ← flag de controle do grupo
  .in('subscription_status', ['active']);
```
Isso retorna exatamente o mesmo conjunto que a aba "SaaS Tracker" mostra.

### Passo 2 — Buscar **último lançamento real de cada mestre** (para pegar valor atualizado)
```ts
const masterIds = masters.map(m => m.id);
const { data: latestChildren } = await supabase
  .from('expenses')
  .select('*')
  .eq('agency_id', agencyId)
  .in('parent_expense_id', masterIds)
  .order('due_date', { ascending: false })
  .range(0, 4999);
```

### Passo 3 — Compor lista projetada
Para cada mestre ativo, escolher o `amount` mais recente disponível (último filho ou o próprio mestre se não houver filhos), e usar o `recurrence_day` ou o dia do due_date mais recente:
```ts
const forecastRecurringSubscriptions = masters.map(master => {
  const children = latestChildren.filter(c => c.parent_expense_id === master.id);
  const mostRecent = children[0] || master;  // children já vem desc
  return {
    ...master,
    amount: mostRecent.amount,           // valor atualizado (ex.: Adveronix 232.71 vs 230.35 antigo)
    due_date: mostRecent.due_date,       // referência para o recurrence_day
  };
});
```

### Passo 4 — Anti-fantasma (manter o corte de 60 dias, mas no nível do grupo)
Filtrar grupos onde **nenhum** lançamento existe nos últimos 60 dias (assinatura realmente esquecida):
```ts
.filter(item => {
  const hasRecent = (latestChildren.find(c => c.parent_expense_id === item.id)?.due_date 
                     ?? item.due_date) >= sixtyDaysAgoISO;
  return hasRecent;
})
```
Como o cron de virada de mês cria filhos automaticamente, qualquer assinatura viva terá lançamentos recentes. Apenas grupos abandonados (sem lançamento há 60+ dias) são excluídos.

## Resultado esperado

- Card "Composição": **Assinaturas Recorrentes (12+ ativas)** — bate com SaaS Tracker.
- Fluxo de caixa projetado: lista todas as assinaturas ativas com seus valores mais recentes.
- Total de custos sobe para refletir a realidade.
- Parcelamentos continuam sendo tratados separadamente (sem mudança).

## Garantias

| # | Garantia |
|---|---|
| 1 | Source of truth = mestre (`parent_expense_id IS NULL` + `is_active=true`) — mesmo critério que a Central SaaS Tracker usa. |
| 2 | Valor sempre atualizado (último filho), suportando reajustes (ex: Adveronix subiu de 227→232). |
| 3 | Anti-fantasma preservado via 60d no grupo, não no lançamento. |
| 4 | Pausados/cancelados (`subscription_status≠active` ou `is_active=false` no mestre) ficam de fora. |
| 5 | Sem migrations, sem mudança em outros componentes. |

## Ficheiros alterados
- `src/hooks/useFinancialMetrics.tsx` — refatorar `recurringActiveQuery` para mestres + último filho.

