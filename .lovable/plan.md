
# Correção definitiva: RLS + Drag-and-drop no CustomStatusManager de Social Media

## Diagnóstico confirmado

Consultando o banco diretamente, as políticas atuais são:

| Política | Operação | Função usada |
|----------|----------|--------------|
| Agency admins can insert custom statuses | INSERT | `is_agency_admin(agency_id)` ← **ERRADO** |
| Agency admins can update custom statuses | UPDATE | `is_agency_admin(agency_id)` ← **ERRADO** |
| Agency admins can delete custom statuses | DELETE | `is_agency_admin(agency_id)` ← **ERRADO** |
| Agency members can view custom statuses | SELECT | `user_belongs_to_agency(agency_id)` ← correto |

As tentativas anteriores de migração **não foram aplicadas corretamente** — as políticas antigas ainda existem no banco com `is_agency_admin`. Giovanna não é admin, então toda operação de escrita falha.

O arquivo `src/components/social-media/settings/CustomStatusManager.tsx` **não tem nenhum código de drag-and-drop** — o `GripVertical` é puramente visual. O CRM (`src/components/crm/CustomStatusManager.tsx`) já tem a implementação completa com `@dnd-kit`.

---

## Parte 1 — Migração SQL (corrigir RLS de vez)

```sql
-- Remover todas as políticas de escrita que usam is_agency_admin
DROP POLICY IF EXISTS "Agency admins can insert custom statuses" ON social_media_custom_statuses;
DROP POLICY IF EXISTS "Agency admins can update custom statuses" ON social_media_custom_statuses;
DROP POLICY IF EXISTS "Agency admins can delete custom statuses" ON social_media_custom_statuses;

-- Recriar usando user_belongs_to_agency (qualquer membro da agência)
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

## Parte 2 — Reescrita completa do CustomStatusManager.tsx de Social Media

O componente será reescrito seguindo exatamente o padrão do CRM que já funciona. Diferenças importantes em relação ao CRM:

- Os status **padrão** do Social Media são hard-coded no frontend (não existem no banco), então ficam **fixos no topo, fora do DndContext**
- Apenas os status **customizados** (que existem no banco) ficam dentro do `DndContext` e são arrastáveis
- A `reorderMutation` salva `order_position` apenas para status customizados

### Estrutura do componente final:

```text
[Formulário de adição — igual ao atual]

[Status Padrões — lista estática, sem arrastar]
  ● Briefing       (Padrão)
  ● Em Criação     (Padrão)
  ● Aguardando Aprovação  (Padrão)
  ● Aprovado       (Padrão)
  ● Publicado      (Padrão)

[Status Customizados — dentro do DndContext, arrastáveis]
  ⠿ ● Onboarding   [toggle ativo/inativo] [lixeira]
  ⠿ ● Em Revisão   [toggle ativo/inativo] [lixeira]
```

### Código do `SortableStatusItem` (sub-componente com drag funcional):
- Usa `useSortable({ id: status.id })` do `@dnd-kit/sortable`
- O `GripVertical` recebe `{...attributes}` e `{...listeners}` para ser o handle de arraste
- Aplica `opacity: 0.5` enquanto está sendo arrastado (`isDragging`)

### `reorderMutation`:
- Recebe array de `{ id, order_position }`
- Faz `Promise.all` de updates no banco para cada item customizado reordenado
- Chama `invalidateStatuses()` no `onSuccess`

### `handleDragEnd`:
- Busca índice do item arrastado e do destino apenas dentro de `customStatuses`
- Usa `arrayMove` para reordenar o array
- Gera updates com índices 0, 1, 2... e chama `reorderMutation`

---

## Arquivos modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| Nova migration SQL | Banco | Substituir `is_agency_admin` → `user_belongs_to_agency` nas 3 políticas de escrita |
| `src/components/social-media/settings/CustomStatusManager.tsx` | Frontend | Adicionar DnD completo com `@dnd-kit`, `SortableStatusItem` e `reorderMutation` |

## Resultado esperado

- Giovanna (e qualquer membro da agência) consegue criar, editar e excluir status sem erro de RLS
- Status customizados exibem o ícone de arrastar funcional (igual ao print de referência)
- A nova ordem é salva no banco imediatamente após soltar o item
- Status padrão permanecem fixos no topo e não são arrastáveis
