

# Cores nos Badges de Tipo + Destaque no Modal de Detalhes

## Resumo

Duas melhorias visuais para diferenciar melhor os tipos de tarefa, especialmente "Redes Sociais" vs "Criativos":

1. Badges de tipo coloridos no card (kanban e lista)
2. Tipo da tarefa explicitamente visivel no modal de detalhes

## 1. Mapa de Cores por Tipo de Tarefa

Cada tipo tera uma cor fixa associada, aplicada como classes Tailwind no badge:

| Tipo | Cor | Classes |
|------|-----|---------|
| Redes Sociais | Indigo | `bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300` |
| Criativos | Rosa | `bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300` |
| Reuniao | Azul | `bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300` |
| Conteudo | Amber | `bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300` |
| Desenvolvimento | Cyan | `bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300` |
| Suporte | Teal | `bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300` |
| Administrativo | Slate | `bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300` |
| Outros | Gray (default) | `bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300` |

## 2. Arquivos Modificados

### `src/components/ui/task-card.tsx`

- Criar funcao `getTypeColor(slug)` que retorna as classes CSS baseado no slug do tipo
- Substituir `variant="outline"` no badge de tipo por classes coloridas dinamicas
- Incluir o icone do tipo (emoji) dentro do badge para reforcar visualmente

### `src/components/tasks/TaskDetailsDialog.tsx`

- Aceitar novas props: `taskType?: string`, `getTypeName`, `getTypeIcon`
- Adicionar badge de tipo proeminente logo abaixo do titulo, junto aos badges de status/prioridade
- Na secao "Redes Sociais" (linha 290), mudar o titulo dinamicamente: se `taskType` for `criativos`, mostrar "Criativos" em vez de "Redes Sociais", e ajustar o icone para `Palette`
- Isso torna explicito se a tarefa e de Redes Sociais ou Criativos

### `src/components/ui/sortable-task-card.tsx`

- Verificar se ja passa `getTypeName`/`getTypeIcon` ao `TaskCard` interno e garantir que esta correto

### Paginas que usam `TaskDetailsDialog`

- `src/pages/Tasks.tsx` (principal) - passar `taskType` e helpers de tipo ao dialog

## Detalhes Tecnicos

A funcao de cores ficara no `task-card.tsx` mas sera exportada para reutilizacao:

```text
getTypeColor(slug: string): string
  "redes_sociais" -> "bg-indigo-100 text-indigo-800 ..."
  "criativos"     -> "bg-pink-100 text-pink-800 ..."
  ...
  default         -> "bg-gray-100 text-gray-800 ..."
```

No modal de detalhes, o badge de tipo aparecera na mesma linha dos badges de status e prioridade, com a cor correspondente e o emoji do tipo, ficando visualmente claro qual e o tipo da tarefa.

