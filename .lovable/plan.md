
# Correção: Criação de Status Customizados no Kanban de Social Media

## Diagnóstico

O erro `new row violates row-level security policy for table "social_media_custom_statuses"` ocorre porque a política RLS de gerenciamento (`Agency admins can manage custom statuses`) cobre ALL operations mas **não possui cláusula `WITH CHECK`**.

No PostgreSQL, para operações de `INSERT` e `UPDATE`, o RLS exige que tanto o `USING` (filtragem de leitura) quanto o `WITH CHECK` (validação de escrita) estejam definidos. Quando a política usa `FOR ALL` sem `WITH CHECK`, o banco aplica o `USING` como verificação de escrita — mas como a `agency_id` do novo registro ainda não existe na tabela no momento do INSERT, a função `is_agency_admin(agency_id)` retorna `false`, bloqueando a inserção.

## Solução em 2 partes

### Parte 1 — Corrigir a política RLS (migração SQL)

Recriar as políticas com separação clara entre `SELECT`, `INSERT`, `UPDATE` e `DELETE`:

```sql
-- Remover política antiga
DROP POLICY IF EXISTS "Agency admins can manage custom statuses" ON social_media_custom_statuses;

-- Política para INSERT (com WITH CHECK no agency_id enviado)
CREATE POLICY "Agency admins can insert custom statuses"
ON social_media_custom_statuses FOR INSERT
TO authenticated
WITH CHECK (is_agency_admin(agency_id));

-- Política para UPDATE
CREATE POLICY "Agency admins can update custom statuses"
ON social_media_custom_statuses FOR UPDATE
TO authenticated
USING (is_agency_admin(agency_id))
WITH CHECK (is_agency_admin(agency_id));

-- Política para DELETE
CREATE POLICY "Agency admins can delete custom statuses"
ON social_media_custom_statuses FOR DELETE
TO authenticated
USING (is_agency_admin(agency_id));
```

### Parte 2 — Garantir sincronização em todos os componentes

Após criar o novo status, ele precisa aparecer automaticamente em:

| Componente | Status atual | Ajuste |
|-----------|-------------|--------|
| `PostKanban.tsx` | ✅ Já busca `custom_statuses` ativos | Nenhum |
| `PostFormDialog.tsx` | Busca custom statuses mas precisa verificar | Confirmar que inclui novos status no select |
| `PostDetailsDialog.tsx` | Busca custom statuses | Confirmar funcionamento |
| `CustomStatusManager.tsx` | Cria status sem `is_active` explícito | Garantir `is_active: true` no insert |

**Problema adicional no `CustomStatusManager.tsx`:** O insert não envia `is_active: true` explicitamente — apesar de o banco ter `DEFAULT true`, é boa prática enviá-lo. Mais importante: após criar o status, o invalidate de queries usa só `["custom-statuses"]` sem o `agency_id`, o que pode não refrescar o Kanban (que usa `['custom-statuses', currentAgency?.id]`).

## Arquivos a Modificar

1. **Migração SQL** — corrigir política RLS com `WITH CHECK`
2. **`src/components/social-media/settings/CustomStatusManager.tsx`** — adicionar `is_active: true` no insert e corrigir invalidação de queries para incluir o `agency_id`

## Resultado Esperado

- Admin consegue criar, editar e excluir status customizados sem erro RLS
- Novo status aparece imediatamente como coluna no Kanban
- Novo status aparece no select de status do formulário de criação/edição de post
- Todas as abas (Calendário, Planejamento Semanal, Detalhes do Post) sincronizam com o novo status
