

# Health Score inteligente, transparente e personalizável

## 1. Migration (schema)

Adicionar coluna `health_score_rules JSONB` à tabela `clients` (nullable, default `NULL`). Sem trigger; valida no app.

```sql
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS health_score_rules JSONB;
```

## 2. Tipagem partilhada

Criar `src/types/healthScore.ts`:
```ts
export interface HealthScoreRules {
  meeting_frequency_days: number; // default 30
  max_overdue_tasks: number;      // default 0
  min_nps_score: number;          // default 8
}
export const DEFAULT_HEALTH_RULES: HealthScoreRules = {
  meeting_frequency_days: 30,
  max_overdue_tasks: 0,
  min_nps_score: 8,
};
```

## 3. Refator de `ClientHealthScore.tsx`

### Cálculo dinâmico (pesos: Reuniões 40 / Entregas 30 / Satisfação 30)
- `calculateDynamicScore(client, tasks, meetings, nps)` lê `client.health_score_rules` e mistura com `DEFAULT_HEALTH_RULES`.
- **Reuniões (40 pts)**: penalização proporcional se dias desde última reunião > `meeting_frequency_days`. Sem reuniões = 0 pts neste pilar.
- **Entregas (30 pts)**: 30 - (overdueTasks - max_overdue_tasks) × 10, mínimo 0.
- **Satisfação (30 pts)**: NPS ≥ min_nps_score = 30; entre 6 e min = 15; ≤6 = 0; sem NPS = 20 (neutro).
- Score final = soma dos 3 pilares. Cores mantidas (≥80 verde / ≥50 âmbar / <50 vermelho).
- Função retorna `{ score, breakdown: { meetings, deliveries, satisfaction }, rules }` para uso na legenda.

### UI — variant `circle` com cabeçalho enriquecido
Adicionar acima do gauge um cabeçalho com:
- Título "Saúde do Cliente" (ou via prop opcional `showHeader`).
- `Info` icon → `Popover` com a legenda dos 3 pilares usando os valores reais (`X dias`, `Y tarefas`, `NPS Z`) + breakdown atual ("Reuniões: 32/40", etc.).
- `Settings` icon → abre `Dialog` "Personalizar Saúde do Cliente" com 3 inputs numéricos.

> Para evitar duplicação com o cabeçalho atual em `ClientDetail.tsx` (linha 494), adiciono prop `showHeader?: boolean` (default `false` para manter compat) e em `ClientDetail.tsx` removo o `<h3>` antigo passando `showHeader`. Os ícones Info/Settings ficam alinhados à direita do título interno.

### Dialog de personalização
- Form local (useState) com 3 inputs (`type="number"`, min 1).
- Botão "Restaurar padrão" (preenche com `DEFAULT_HEALTH_RULES`).
- Botão "Salvar" → `supabase.from('clients').update({ health_score_rules: rules }).eq('id', client.id)` + `queryClient.invalidateQueries({ queryKey: ['client', client.id] })` e `['clients']`.
- Toast de sucesso/erro via `useToast`.
- Estilo "quiet luxury": espaçamentos generosos, labels descritivas com 1 linha de hint cinza por campo.

### Variant `badge` (lista de clientes)
Mantém comportamento atual — sem ícones extras (a tabela em `Clients.tsx` já passa arrays vazios; só usa o número/label).

## 4. Atualização em `ClientDetail.tsx`
- Remover `<h3>Saúde do Cliente</h3>` (linha 494).
- Passar `showHeader` ao `<ClientHealthScore variant="circle" showHeader />`.

## Guardrails UX (quiet luxury)
- Ícones `Info` e `Settings` em `text-muted-foreground hover:text-foreground`, tamanho `h-4 w-4`.
- Popover com largura `w-80`, espaçamento `space-y-3`, emoji apenas como bullet visual.
- Dialog `sm:max-w-md`, sem títulos duplicados nos filhos.

## Ficheiros alterados
- **Migration** — adiciona `clients.health_score_rules` (jsonb).
- **Novo**: `src/types/healthScore.ts`
- `src/components/clients/ClientHealthScore.tsx` (refator + Popover + Dialog + breakdown)
- `src/pages/ClientDetail.tsx` (remove `<h3>` duplicado, passa `showHeader`)

Sem mudanças em `Clients.tsx` (badge variant intocada). Sem edge functions.

