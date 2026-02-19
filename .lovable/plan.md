
# Corrigir colunas duplicadas no Kanban de Social Media

## Causa raiz confirmada

No banco, a agência tem os seguintes status (em ordem):

| order_position | slug | name | is_default |
|---|---|---|---|
| 0 | draft | Briefing | true |
| 1 | aguardando_material | Aguardando Material | false |
| 2 | in_creation | Em Criação | true |
| 3 | pending_approval | Aguardando Aprovação | true |
| 4 | approved | Aprovado | true |
| 5 | published | Publicado | true |

O problema está em `PostKanban.tsx` nas linhas 75–91:

```ts
// ❌ CÓDIGO ATUAL — gera duplicatas
const allColumns = useMemo(() => {
  const defaultCols = [          // ← 5 colunas hard-coded
    { id: "draft", title: "Briefing", ... },
    { id: "in_creation", title: "Em Criação", ... },
    ...
  ];
  const customCols = customStatuses.map(...); // ← todos do banco (inclui is_default=true E false)
  return [...defaultCols, ...customCols];     // ← duplica os 5 padrões!
}, [customStatuses]);
```

Como os status padrão agora vivem no banco (igual a Tarefas), o `PostKanban` não deve mais ter nenhuma lista hard-coded. Deve buscar tudo do banco.

## Correção — 1 arquivo

### `src/components/social-media/PostKanban.tsx`

**1. Remover o array `defaultCols` hard-coded** (linhas 76–82)

**2. Alterar a query `custom-statuses`** para buscar **todos** os status ativos da agência (sem filtro adicional além de `is_active = true`), já ordenados por `order_position` — exatamente como está, mas o `useMemo` de `allColumns` passa a usar só o resultado do banco:

```ts
// ✅ NOVO — usa apenas o banco, sem hard-code
const allColumns = useMemo(() => {
  return customStatuses.map(status => ({
    id: status.slug,
    title: status.name,
    color: status.color,
  }));
}, [customStatuses]);
```

A query já filtra `is_active = true` e ordena por `order_position`, então a ordem do Kanban refletirá automaticamente qualquer reordenação feita em Configurações.

**3. Renomear a queryKey** de `'custom-statuses'` para `'social-media-statuses-kanban'` para evitar conflito de cache com a query do `CustomStatusManager` (que usa `'social-media-statuses-all'` e inclui status inativos).

## Resultado esperado

- Sem colunas duplicadas
- A ordem das colunas no Kanban reflete exatamente a ordem configurada em Configurações → Status do Kanban
- Status customizados como "Aguardando Material" aparecem na posição correta (order_position 1, entre Briefing e Em Criação)
- Ao reordenar ou criar novos status em Configurações, o Kanban atualiza automaticamente

## Arquivo modificado

| Arquivo | Mudança |
|---|---|
| `src/components/social-media/PostKanban.tsx` | Remover `defaultCols` hard-coded; `allColumns` passa a derivar 100% da query do banco |
