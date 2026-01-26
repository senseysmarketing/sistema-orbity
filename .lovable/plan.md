
# Abreviações Inteligentes nos Badges de Tarefas

## Problema

Quando há múltiplos badges no card (Tipo + Prioridade + Urgência), eles não cabem na mesma linha e ficam visualmente poluídos, mesmo com scroll horizontal.

## Solução

Usar versões abreviadas para os textos dos badges, mantendo a informação essencial em menos caracteres. Isso garantirá que todos os badges caibam confortavelmente na linha sem necessidade de scroll.

## Abreviações Propostas

### Prioridade
| Atual | Abreviado |
|-------|-----------|
| Baixa | Baixa |
| Média | Média |
| Alta | Alta |
*(Prioridades já são curtas, mantemos como estão)*

### Urgência
| Atual | Abreviado |
|-------|-----------|
| Atrasada | Atrasada |
| Hoje | Hoje |
| Amanhã | Amanhã |
| Esta Semana | Sem. |
*(Apenas "Esta Semana" precisa abreviar)*

### Tipo de Tarefa
| Atual | Abreviado |
|-------|-----------|
| Reunião | Reunião |
| Design | Design |
| Desenvolvimento | Desenv. |
| Conteúdo | Conteúdo |
| Suporte | Suporte |
| Administrativo | Admin. |
*(Abreviar apenas os mais longos)*

## Alterações Técnicas

### 1. Hook `useTaskTypes.tsx`
Adicionar função `getTypeShortName(slug)` que retorna a versão abreviada do nome do tipo.

### 2. `task-card.tsx`
- Usar `getTypeShortName` ao invés de `getTypeName` no badge
- Para urgência, mostrar apenas o ícone quando for "Esta Semana" (sem texto) ou abreviar para "Sem."

### 3. Interface `TaskCardProps`
Adicionar prop opcional `getTypeShortName` para compatibilidade.

## Resultado Esperado

- Todos os badges cabem na mesma linha sem scroll
- Informação mantida de forma legível
- Layout limpo e consistente
- Tooltip com nome completo pode ser adicionado para acessibilidade (opcional)

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/hooks/useTaskTypes.tsx` | Adicionar `getTypeShortName()` |
| `src/components/ui/task-card.tsx` | Usar abreviações nos badges |
| `src/components/ui/sortable-task-card.tsx` | Passar `getTypeShortName` como prop |
| `src/pages/Tasks.tsx` | Passar `getTypeShortName` para os componentes |
