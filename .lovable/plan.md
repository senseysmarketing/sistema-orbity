

# Correcoes no Dashboard: Tarefas/Posts Solicitados, Timeline e Rotinas

## Problema 1: Tarefas/Posts Solicitados nao aparecem

A query de tarefas solicitadas no `Index.tsx` (linha 169) nao filtra `archived = false`. Tarefas arquivadas estao poluindo ou impedindo a exibicao. Alem disso, tasks com status customizado equivalente a "done" (como `em_revisao`) nao sao filtradas, mas isso e menor.

**Correcao**: Adicionar `.eq('archived', false)` na query de tarefas solicitadas.

## Problema 2: Timeline nao exibe tarefas/posts solicitados

O componente `DayTimeline.tsx` so busca notificacoes e rotinas. Nao busca tarefas nem posts do usuario para o dia. O usuario quer ver suas tarefas (com `due_date` de hoje) e posts (com `scheduled_date` de hoje) tambem na linha do tempo, incluindo os solicitados.

**Correcao**: No `DayTimeline.tsx`, buscar tambem:
- Tarefas atribuidas ao usuario com `due_date` de hoje
- Posts atribuidos ao usuario com `scheduled_date` de hoje
- Tarefas criadas pelo usuario (solicitadas) com `due_date` de hoje
- Posts criados pelo usuario (solicitados) com `scheduled_date` de hoje

Exibi-los como itens na timeline usando o horario do `due_date` (se tiver hora) ou no topo (se for apenas data).

## Problema 3: Rotinas com multiplos dias tratadas como uma so

Este e o bug principal. A tabela `routine_completions` rastreia conclusao por **semana** (`week_number`), nao por **dia**. Uma rotina com `week_days: [1, 3, 5]` (Seg, Qua, Sex) ao ser marcada como concluida na segunda-feira, cria um registro com `week_number = X`, e isso faz o sistema considerar TODOS os dias daquela semana como concluidos.

**Correcao**:
1. Adicionar coluna `day_of_week` (integer, nullable) na tabela `routine_completions`
2. Ao marcar/desmarcar uma rotina semanal, salvar o `day_of_week` especifico
3. Atualizar `isCompleted()` para verificar por dia especifico
4. Atualizar `isRoutineLate()` para verificar cada dia individualmente
5. Na `WeeklyView`, verificar conclusao por dia
6. Na `DayTimeline`, verificar conclusao por dia

## Mudancas Tecnicas

### Migracao de Banco

Adicionar coluna `day_of_week` na tabela `routine_completions`:

```sql
ALTER TABLE routine_completions ADD COLUMN day_of_week integer;
```

### Arquivos Modificados

| Arquivo | Descricao |
|---|---|
| `src/pages/Index.tsx` | Adicionar filtro `archived = false` na query de tarefas solicitadas |
| `src/components/dashboard/DayTimeline.tsx` | Buscar e exibir tarefas e posts do dia na timeline |
| `src/components/dashboard/RoutineBlock.tsx` | Alterar `isCompleted`, `handleToggle`, `isRoutineLate` e `WeeklyView` para usar `day_of_week` |

### Detalhes de cada arquivo

**Index.tsx**: Linha 173, adicionar `.eq('archived', false)` na query de `createdTasks`.

**DayTimeline.tsx**:
- Buscar `task_assignments` do usuario para pegar IDs de tarefas
- Buscar tarefas com `due_date` de hoje
- Buscar `post_assignments` do usuario para pegar IDs de posts
- Buscar posts com `scheduled_date` de hoje
- Buscar tarefas/posts criados pelo usuario (solicitados) com data de hoje
- Montar items de timeline para cada um, usando o horario do `due_date`/`scheduled_date`

**RoutineBlock.tsx**:
- `isCompleted(routine)` para weekly: verificar `c.day_of_week === dayIso` alem de `c.week_number`
- `handleToggle(routine)`: receber o `dayIso` como parametro, incluir `day_of_week` no insert
- `isRoutineLate()`: verificar cada dia individualmente contra completions com `day_of_week` correspondente
- `WeeklyView`: passar o dia especifico ao chamar `handleToggle`
- Progresso semanal: contar total de slots (soma de `week_days.length` de cada rotina) vs completions com `day_of_week`

