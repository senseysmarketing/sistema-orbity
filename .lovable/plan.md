

# Corrigir status do CRM desaparecendo para membros

## Problema identificado

A politica de seguranca (RLS) da tabela `lead_statuses` exige que o usuario seja **admin ou owner** para **qualquer operacao**, incluindo leitura. Isso significa que membros comuns da agencia nao conseguem carregar os status do Kanban.

Consequencias:
- A pagina de configuracoes mostra a lista de status vazia
- O pipeline usa um fallback com apenas os 7 status padrao, sem incluir o "Desqualificados" customizado
- Colunas customizadas nao aparecem no Kanban

## Causa raiz

A tabela `lead_statuses` tem uma unica RLS policy:
```
Policy: "Agency admins can manage lead statuses"
Command: ALL
Condition: is_agency_admin(agency_id)
```

Usuarios com role `member` falham nessa verificacao e recebem 0 registros.

## Solucao

### 1. Corrigir RLS da tabela `lead_statuses` (SQL migration)

Substituir a politica unica por duas:

- **SELECT**: permitir para todos os membros da agencia (qualquer role)
- **INSERT/UPDATE/DELETE**: manter apenas para admins e owners

```sql
-- Remover policy antiga
DROP POLICY IF EXISTS "Agency admins can manage lead statuses" ON lead_statuses;

-- Leitura para todos os membros da agencia
CREATE POLICY "Agency members can view lead statuses"
  ON lead_statuses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agency_users
      WHERE agency_users.user_id = auth.uid()
      AND agency_users.agency_id = lead_statuses.agency_id
    )
  );

-- Escrita apenas para admins/owners
CREATE POLICY "Agency admins can manage lead statuses"
  ON lead_statuses FOR ALL
  USING (is_agency_admin(agency_id))
  WITH CHECK (is_agency_admin(agency_id));
```

### 2. Melhorar normalizacao de status customizados no frontend

Arquivo: `src/components/crm/LeadsKanban.tsx`

Ajustar a funcao `normalizeStatusToDb` e o agrupamento de leads para comparar status de forma case-insensitive, garantindo que leads salvos com variantes como "desqualificados" (minusculo) sejam agrupados corretamente na coluna "Desqualificados".

| Arquivo | Tipo de mudanca |
|---|---|
| Migration SQL | Dividir RLS policy: leitura para membros, escrita para admins |
| `src/components/crm/LeadsKanban.tsx` | Comparacao case-insensitive no agrupamento de leads |

## Resultado esperado

- Todos os membros da agencia verao os status no pipeline e na pagina de configuracoes
- O status "Desqualificados" aparecera como coluna no Kanban
- Apenas admins/owners poderao criar, editar ou excluir status
