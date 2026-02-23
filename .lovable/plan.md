
# Corrigir Posts em "Publicado" sem Historico + Proteger Workflow

## Problema Identificado

O formulario de criacao de posts permite selecionar qualquer status, incluindo "Publicado", no momento da criacao. Isso faz com que posts sejam criados diretamente em "Publicado" sem passar pelo workflow e sem registro no historico de movimentacoes.

42 posts da agencia foram criados assim pela Suellen, o que explica o historico vazio.

## Solucao (2 partes)

### Parte 1: Travar status na criacao de posts

Ao **criar** um novo post, o campo de status sera automaticamente definido como o primeiro status da lista (Briefing/draft) e o dropdown ficara desabilitado ou oculto. O usuario so pode alterar o status via drag-and-drop no Kanban (que registra historico) ou editando o post depois.

Ao **editar** um post existente, o dropdown de status continua disponivel normalmente, mas a mudanca de status sera registrada no historico (isso ja funciona).

**Arquivo:** `src/components/social-media/PostFormDialog.tsx`
- Na criacao (`!editPost`): forcar `status` para o primeiro custom status (slug do primeiro item da lista ordenada por `order_position`) e esconder o dropdown de status
- Na edicao (`editPost`): manter o dropdown visivel como esta hoje

### Parte 2: Corrigir posts existentes com historico vazio

Criar uma query SQL para resetar os posts que estao em 'published' com historico vazio, movendo-os de volta para 'draft' (Briefing). Isso permite que a equipe reposicione cada post no status correto.

```text
UPDATE social_media_posts
SET status = 'draft', updated_at = now()
WHERE agency_id = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0'
  AND status = 'published'
  AND (approval_history IS NULL OR approval_history::text = '[]');
```

Isso afeta 42 posts que nao tem historico de movimentacao. Os posts que FORAM legitimamente publicados (com historico) nao serao afetados.

## Detalhe Tecnico

### `PostFormDialog.tsx`

Mudanca na renderizacao do formulario:

```text
Se esta criando (!editPost):
  - Setar formData.status = primeiro status (draft)
  - Nao renderizar o dropdown de status
  - Exibir apenas um Badge/Label informativo: "Status: Briefing"

Se esta editando (editPost):
  - Manter o dropdown de status como esta hoje
  - Continua registrando mudancas no historico
```

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `src/components/social-media/PostFormDialog.tsx` | Esconder dropdown de status na criacao, forcar primeiro status |

## Acao Manual Necessaria

Apos a implementacao, sera necessario executar a query SQL de correcao para resetar os 42 posts afetados. Isso pode ser feito diretamente no Supabase SQL Editor ou posso incluir como migracao.
