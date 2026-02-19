
# Correção: Permissão para todos os membros criarem status + Drag-and-drop de reordenação

## Problema 1 — RLS ainda restrito a admins

As políticas atuais exigem `is_agency_admin(agency_id)` para INSERT, UPDATE e DELETE. O usuário "Giovanna" não é admin, por isso continua recebendo erro de RLS ao tentar criar um status.

A solução é alterar as 3 políticas (INSERT, UPDATE, DELETE) para usar `user_belongs_to_agency(agency_id)` — permitindo que qualquer membro autenticado da agência gerencie os status.

**Migração SQL:**
```sql
-- Remover políticas restritivas
DROP POLICY IF EXISTS "Agency admins can insert custom statuses" ON social_media_custom_statuses;
DROP POLICY IF EXISTS "Agency admins can update custom statuses" ON social_media_custom_statuses;
DROP POLICY IF EXISTS "Agency admins can delete custom statuses" ON social_media_custom_statuses;

-- Criar políticas abertas para qualquer membro da agência
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

## Problema 2 — Falta de drag-and-drop para reordenar

Assim como no gerenciador de status de tarefas (`src/components/crm/CustomStatusManager.tsx`), o componente de Social Media não tem reordenação por arrastar. O ícone `GripVertical` existe visualmente mas não funciona.

A solução é replicar a mesma lógica de DnD já existente no projeto.

## Arquivo a modificar

`src/components/social-media/settings/CustomStatusManager.tsx`:
1. Importar `DndContext`, `SortableContext`, `useSortable`, `arrayMove` do `@dnd-kit`
2. Criar componente `SortableStatusItem` com drag handle funcional
3. Adicionar `reorderMutation` que salva a nova `order_position` no banco para status customizados
4. O drag-and-drop se aplica apenas aos status **customizados** (os padrão ficam fixos no topo)

## Estrutura final do componente

```text
[Status Padrões — fixos, sem arrastar]
  ● Briefing       (Padrão)
  ● Em Criação     (Padrão)
  ● Aguardando Aprovação (Padrão)
  ● Aprovado       (Padrão)
  ● Publicado      (Padrão)

[Status Customizados — arrastáveis]
  ⠿ ● Onboarding   [toggle] [lixeira]
  ⠿ ● Em Revisão   [toggle] [lixeira]
```

## Resumo das mudanças

| O quê | Arquivo | Descrição |
|-------|---------|-----------|
| Migração SQL | Nova migration | Troca `is_agency_admin` → `user_belongs_to_agency` nas 3 políticas |
| Permissão | `CustomStatusManager.tsx` | Qualquer membro pode criar/editar/excluir |
| Drag-and-drop | `CustomStatusManager.tsx` | Reordenação de status customizados com persistência no banco |
