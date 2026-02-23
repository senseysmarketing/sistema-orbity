
# Corrigir Tarefas/Posts Solicitados que nao aparecem

## Problema Raiz

As queries de "Tarefas Solicitadas" e "Posts Solicitados" no `Index.tsx` estao retornando **erro 400** do Supabase:

```
"Could not find a relationship between 'task_assignments' and 'profiles'"
"Could not find a relationship between 'post_assignments' and 'profiles'"
```

A causa e que nao existe foreign key de `task_assignments.user_id` para `profiles`, nem de `post_assignments.user_id` para `profiles`. O Supabase PostgREST nao consegue fazer o join `task_assignments(user_id, profiles(name))`.

Como resultado, ambas as queries falham silenciosamente (retornam `null`), e o componente recebe um array vazio.

## Solucao

Alterar as queries no `Index.tsx` para buscar tarefas/posts **sem o join aninhado de profiles**. Em vez disso, buscar apenas `task_assignments(user_id)` e `post_assignments(user_id)`, e depois fazer uma segunda query para buscar os nomes dos usuarios.

Tambem adicionar na `RequestedTasksList` uma secao "Pendentes" para tarefas sem data ou com data futura (alem desta semana), igual ja existe no `RequestedPostsList`.

## Mudancas Tecnicas

### `src/pages/Index.tsx`

Alterar as duas queries (linhas 169-175 e 181-187):

**Antes:**
```
task_assignments(user_id, profiles(name))
```

**Depois:**
```
task_assignments(user_id)
```

Apos buscar as tarefas/posts, fazer uma query separada para `profiles` usando os `user_id`s encontrados nas assignments, e montar o objeto `profiles: { name }` manualmente antes de passar para os componentes.

### `src/components/dashboard/RequestedTasksList.tsx`

Adicionar secao "Pendentes" para tarefas sem `due_date` ou com data alem desta semana (mesma logica que `RequestedPostsList` ja tem com `pendingNoDue`). Atualizar o calculo de `isEmpty` para incluir essa nova secao.

| Arquivo | Descricao |
|---|---|
| `src/pages/Index.tsx` | Corrigir queries removendo join invalido e buscando profiles separadamente |
| `src/components/dashboard/RequestedTasksList.tsx` | Adicionar secao "Pendentes" para tarefas sem data |
