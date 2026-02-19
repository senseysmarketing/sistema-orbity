
# Replicar exatamente o padrão de Tarefas no Social Media

## Diagnóstico

| Aspecto | Tarefas (funciona) | Social Media (problema) |
|---|---|---|
| Status padrão | Salvos no banco (`task_statuses`, `is_default=true`) | Hard-coded no frontend, nunca inseridos no banco |
| DndContext | Único, engloba todos os status | Dois blocos separados — padrões estáticos, customizados arrastáveis |
| Reordenação | Todos arrastáveis (padrão + custom) | Só customizados |
| Tabela | `task_statuses` | `social_media_custom_statuses` |

A tabela `social_media_custom_statuses` já tem coluna `is_default` — a estrutura é 100% compatível com a lógica de Tarefas. Os status padrão simplesmente nunca foram inseridos no banco para nenhuma agência.

## Solução — 1 arquivo, replicar exatamente o TaskStatusManager

### `src/components/social-media/settings/CustomStatusManager.tsx`

**1. Remover o array hard-coded `defaultStatuses`** — ele passa a ser um array de referência `DEFAULT_STATUSES` usado apenas para inicialização no banco (igual ao TaskStatusManager):

```ts
const DEFAULT_STATUSES = [
  { slug: "draft", name: "Briefing", color: "bg-gray-500", order_position: 0 },
  { slug: "in_creation", name: "Em Criação", color: "bg-blue-500", order_position: 1 },
  { slug: "pending_approval", name: "Aguardando Aprovação", color: "bg-yellow-500", order_position: 2 },
  { slug: "approved", name: "Aprovado", color: "bg-green-500", order_position: 3 },
  { slug: "published", name: "Publicado", color: "bg-purple-500", order_position: 4 },
];
```

**2. Query unificada** — busca TODOS os status da agência (`is_default=true` e `false`), igual ao TaskStatusManager:
```ts
queryKey: ["social-media-statuses-all", currentAgency?.id]
// sem filtro is_default=false
.order("order_position")
```

**3. `initializeDefaultsMutation`** — igual ao TaskStatusManager, insere os padrões no banco se não existirem ainda para a agência:
```ts
// Verifica quais slugs padrão já existem no banco
// Insere apenas os que faltam com is_default=true
// Dispara ao carregar se dbStatuses.length === 0 ou faltam padrões
```

**4. `useEffect` de inicialização** — idêntico ao TaskStatusManager:
```ts
useEffect(() => {
  if (currentAgency?.id && !isLoading && dbStatuses.filter(s => s.is_default).length < DEFAULT_STATUSES.length) {
    initializeDefaultsMutation.mutate();
  }
}, [currentAgency?.id, isLoading, dbStatuses.length]);
```

**5. `allStatuses` via `useMemo`** — lista combinada ordenada por `order_position`:
```ts
const allStatuses = useMemo(() => {
  return [...dbStatuses].sort((a, b) => a.order_position - b.order_position);
}, [dbStatuses]);
```

**6. `SortableStatusItem` atualizado** — recebe `status.is_default`:
- Se `is_default=true`: exibe `(Padrão)`, sem toggle, sem lixeira
- Se `is_default=false`: exibe toggle ativo/inativo + lixeira
- Drag handle (`GripVertical`) funcional para **todos**

**7. `reorderMutation`** — salva `order_position` na tabela `social_media_custom_statuses` para TODOS os items (padrão e customizados), igual ao TaskStatusManager:
```ts
supabase.from("social_media_custom_statuses").update({ order_position }).eq("id", id)
```

**8. `handleDragEnd`** — opera sobre `allStatuses` (lista completa), igual ao TaskStatusManager.

**9. DndContext único** — engloba toda a lista, sem separação:
```tsx
<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={allStatuses.map(s => s.id)}>
    {allStatuses.map(status => <SortableStatusItem ... />)}
  </SortableContext>
</DndContext>
```

## Resultado visual final

```text
[Formulário: nome + cor + botão adicionar]

[Lista única arrastável]
  ⠿ ● Briefing                (Padrão)
  ⠿ ● Em Criação              (Padrão)
  ⠿ ● Aguardando Aprovação    (Padrão)
  ⠿ ● Aprovado                (Padrão)
  ⠿ ● Publicado               (Padrão)
  ⠿ ● Em Revisão   [toggle]   [🗑]
  ⠿ ● Onboarding   [toggle]   [🗑]
```

Todos os itens são arrastáveis. A nova ordem é salva no banco imediatamente.

## Arquivo modificado

| Arquivo | Mudança |
|---------|---------|
| `src/components/social-media/settings/CustomStatusManager.tsx` | Reescrita completa seguindo exatamente o padrão do `TaskStatusManager.tsx` — status padrão inseridos no banco, DndContext único para tudo |

## Observação importante

Na primeira vez que uma agência acessar as configurações após essa mudança, os 5 status padrão serão inseridos automaticamente no banco (mesmo comportamento de Tarefas). A reordenação funciona para todos.
