
# Correção do RoutineBlock + Integração com Linha do Tempo

## Problemas Identificados

### Bug 1: Formulário de adicionar fecha sozinho (Weekly e Monthly)

O problema está na arquitetura do componente. `WeeklyView` e `MonthlyView` são **funções definidas dentro** de `RoutineBlock`:

```typescript
// PROBLEMA: recriada a cada render do pai
const WeeklyView = () => ( ... );
const MonthlyView = () => ( ... );
```

Quando o usuário clica em "+ Add", o estado `showAddDay` muda → `RoutineBlock` re-renderiza → `WeeklyView` é uma **função nova** → React desmonta e remonta o componente → o formulário some.

**Solução:** Transformar `WeeklyView` e `MonthlyView` em componentes externos ao `RoutineBlock` (definidos fora da função), recebendo todas as props necessárias. Isso garante identidade estável e evita a destruição do formulário.

### Bug 2: Mensal não funciona

Mesmo problema. O `MonthlyView` renderiza dentro do `RoutineBlock`, então qualquer mudança de estado no pai (inclusive `setShowMonthlyAdd(true)`) causa a recriação do componente, fechando o formulário antes que o usuário possa interagir.

---

## Solução Técnica

### Reestruturação do RoutineBlock

Extrair `WeeklyView` e `MonthlyView` como componentes de nível de módulo (fora do `export function RoutineBlock`), passando os dados via props:

```typescript
// Fora do componente principal — identidade estável garantida
interface WeeklyViewProps {
  weeklyRoutines: Routine[];
  completions: Completion[];
  loading: boolean;
  showAddDay: number | null;
  setShowAddDay: (v: number | null) => void;
  setShowMonthlyAdd: (v: boolean) => void;
  isCompleted: (r: Routine) => boolean;
  isLate: (r: Routine) => boolean;
  handleToggle: (r: Routine) => void;
  handleDelete: (id: string) => void;
  handleAdd: (data: ...) => Promise<void>;
  isoToday: number;
}

function WeeklyView(props: WeeklyViewProps) { ... }

interface MonthlyViewProps { ... }
function MonthlyView(props: MonthlyViewProps) { ... }
```

Isso resolve **os dois bugs** de uma só vez.

---

## Integração com Linha do Tempo

### O que muda na DayTimeline

A `DayTimeline` atual só exibe notificações. Vamos adicionar uma segunda fonte de dados: **rotinas do usuário que têm horário configurado para hoje**.

**Fluxo de dados:**
1. Buscar rotinas do usuário com `scheduled_time IS NOT NULL`
2. Filtrar as que são do dia atual (weekly: `week_days` contém o dia de hoje; monthly: `day_of_month` = dia de hoje)
3. Combinar com os eventos de notificação em uma lista unificada, ordenada por horário
4. Exibir rotinas como eventos "planejados" (com ícone de rotina `CheckSquare`) e distinguir entre:
   - **Pendente** (horário ainda não passou) — cor neutra
   - **Atrasada** (horário passou, não concluída) — cor destrutiva
   - **Concluída** (marcada como feita) — cor primária com ✓

### Tipos de eventos na timeline combinada

```typescript
type TimelineItem =
  | { source: 'notification'; data: TimelineEvent }
  | { source: 'routine'; data: Routine; status: 'pending' | 'late' | 'done'; time: string };
```

### Ordenação

- Notificações ordenadas por `created_at` (já existente)
- Rotinas ordenadas por `scheduled_time`
- As duas listas são **mescladas** em ordem cronológica
- Rotinas sem horário não aparecem na timeline (só aparecem no RoutineBlock)

### UI das rotinas na timeline

```text
┌─────────────────────────────────────────┐
│  09:00  [☐] Checar métricas de clientes │  ← Pendente (antes da hora)
│  10:00  [⚠️] Enviar relatório           │  ← Atrasada (hora passou)
│  11:14  [✅] Checar e-mails             │  ← Concluída
│  12:03  [🎯] Novo lead: João Silva      │  ← Notificação normal
└─────────────────────────────────────────┘
```

- Badge de tipo: "Rotina" em roxo/indigo, diferenciando de notificações
- Clique na rotina → marca como concluída diretamente na timeline (toggle)
- Atualização automática: quando o usuário marca no RoutineBlock, a timeline reflete (ambos compartilham o mesmo query ao Supabase)

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/RoutineBlock.tsx` | Extração de `WeeklyView` e `MonthlyView` para fora do componente pai (correção dos bugs) |
| `src/components/dashboard/DayTimeline.tsx` | Adicionar segunda fonte de dados (rotinas de hoje com horário), mesclar e ordenar, UI diferenciada, toggle de conclusão inline |

### Sem mudanças de banco

Tudo reutiliza as tabelas já existentes:
- `routines` — filtrado por `user_id` + `scheduled_time IS NOT NULL`
- `routine_completions` — para determinar status (concluída/pendente)
- `notifications` — mantida como está

---

## Resultado Final

- O botão "+ Add" da view semanal vai abrir o formulário corretamente e ele não vai fechar sozinho
- A view mensal vai exibir o botão e o formulário funcionando
- A Linha do Tempo vai mostrar as rotinas do dia com horário, integradas com as notificações, permitindo inclusive marcar como concluída direto da timeline
