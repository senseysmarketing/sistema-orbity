
# Correção Completa: RLS para todos os membros + Drag-and-drop de reordenação

## O que será feito

Duas correções simultâneas:

1. **Banco de dados** — A migração anterior (`20260219...`) criou as políticas corretas COM `WITH CHECK`, mas manteve `is_agency_admin` ao invés de `user_belongs_to_agency`. A Giovanna não consegue criar porque não é admin. Uma nova migração corrige isso.

2. **Frontend** — O `CustomStatusManager.tsx` de Social Media tem o ícone `GripVertical` estático sem nenhuma funcionalidade. O drag-and-drop será implementado identicamente ao que já existe no `src/components/crm/CustomStatusManager.tsx`.

---

## Parte 1 — Nova migração SQL

```sql
-- Remover políticas admin-only criadas na migração anterior
DROP POLICY IF EXISTS "Agency admins can insert custom statuses" ON social_media_custom_statuses;
DROP POLICY IF EXISTS "Agency admins can update custom statuses" ON social_media_custom_statuses;
DROP POLICY IF EXISTS "Agency admins can delete custom statuses" ON social_media_custom_statuses;

-- Recriar para qualquer membro da agência
CREATE POLICY "Agency members can insert custom statuses"
ON social_media_custom_statuses FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can update custom statuses"
ON social_media_custom_statuses FOR UPDATE TO authenticated
USING (user_belongs_to_agency(agency_id))
WITH CHECK (user_belongs_to_agency(agency_id));

CREATE POLICY "Agency members can delete custom statuses"
ON social_media_custom_statuses FOR DELETE TO authenticated
USING (user_belongs_to_agency(agency_id));
```

---

## Parte 2 — Reescrita do CustomStatusManager.tsx (Social Media)

O componente atual tem `GripVertical` decorativo sem função. Será reescrito seguindo exatamente o padrão do CRM (`src/components/crm/CustomStatusManager.tsx`) que já funciona.

### Mudanças no arquivo `src/components/social-media/settings/CustomStatusManager.tsx`:

**Imports adicionados:**
- `DndContext`, `closestCenter`, `KeyboardSensor`, `PointerSensor`, `useSensor`, `useSensors` de `@dnd-kit/core`
- `arrayMove`, `SortableContext`, `sortableKeyboardCoordinates`, `useSortable`, `verticalListSortingStrategy` de `@dnd-kit/sortable`
- `CSS` de `@dnd-kit/utilities`

**Novo componente `SortableStatusItem`** (drag handle funcional):
```tsx
function SortableStatusItem({ status, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: status.id });
  // drag handle com ...attributes e ...listeners no GripVertical
}
```

**Nova `reorderMutation`** — salva `order_position` no banco:
```tsx
const reorderMutation = useMutation({
  mutationFn: async (updates) => {
    const promises = updates.map(({ id, order_position }) =>
      supabase.from("social_media_custom_statuses").update({ order_position }).eq("id", id)
    );
    await Promise.all(promises);
  },
  onSuccess: () => { invalidateStatuses(); toast.success("Ordem atualizada"); }
});
```

**`handleDragEnd`** — reordena apenas os status customizados:
```tsx
const handleDragEnd = (event) => {
  const { active, over } = event;
  if (over && active.id !== over.id) {
    const oldIndex = customStatuses.findIndex(s => s.id === active.id);
    const newIndex = customStatuses.findIndex(s => s.id === over.id);
    const reordered = arrayMove(customStatuses, oldIndex, newIndex);
    const updates = reordered.map((s, i) => ({ id: s.id, order_position: i }));
    reorderMutation.mutate(updates);
  }
};
```

**Estrutura visual final:**

```text
[Status Padrões — fixos no topo, sem arrastar]
  ● Briefing            (Padrão)
  ● Em Criação          (Padrão)
  ● Aguardando Aprovação (Padrão)
  ● Aprovado            (Padrão)
  ● Publicado           (Padrão)

[Status Customizados — com DndContext wrapping]
  ⠿ ● Em Revisão   [toggle ativo/inativo] [lixeira]
  ⠿ ● Onboarding   [toggle ativo/inativo] [lixeira]
```

A descrição do Card também será atualizada para: "Arraste para reordenar os status personalizados. Status padrão não podem ser excluídos."

---

## Arquivos modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| Nova migration SQL | Banco | Trocar `is_agency_admin` → `user_belongs_to_agency` nas 3 políticas |
| `src/components/social-media/settings/CustomStatusManager.tsx` | Frontend | Adicionar DnD funcional com `@dnd-kit` e `reorderMutation` |

## Resultado esperado

- Giovanna (e qualquer membro) consegue criar status sem erro de RLS
- Status customizados são arrastáveis para reordenar (igual à tela de Tarefas)
- Status padrão permanecem fixos e não arrastáveis
- A nova ordem é salva no banco e refletida imediatamente no Kanban
