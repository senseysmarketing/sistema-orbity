
# Fase 3: Migracao de dados e limpeza

## Resumo

Migrar os 112 posts ativos da tabela `social_media_posts` para a tabela `tasks`, redirecionar as atribuicoes de `post_assignments` para `task_assignments`, e depreciar a tabela `social_media_posts`. Apos esta fase, toda a operacao do sistema sera 100% baseada na tabela `tasks`.

## Inventario de dados

- **112 posts ativos** (archived = false) a migrar
- **381 posts arquivados** (archived = true) - serao migrados tambem para manter historico
- **436 registros em post_assignments** - precisam ser redirecionados para task_assignments
- **8 status distintos nos posts**: draft, in_creation, pending_approval, approved, published, scheduled, criados, aguardando_cliente_aprovar

## Alteracoes

### 1. Migration SQL - Migrar posts para tasks

Inserir cada post da tabela `social_media_posts` como uma task com `task_type = 'redes_sociais'`, mapeando os campos:

| Campo post | Campo task |
|---|---|
| `id` | Novo UUID (preservar original como referencia) |
| `title` | `title` |
| `description` | `description` |
| `status` | `status` (mapeado - ver tabela abaixo) |
| `priority` | `priority` |
| `due_date` | `due_date` |
| `created_by` | `created_by` |
| `agency_id` | `agency_id` |
| `created_at` | `created_at` |
| `archived` | `archived` |
| `subtasks` | `subtasks` |
| `attachments` | `attachments` |
| `notification_sent_at` | `notification_sent_at` |
| `platform` | `platform` (campo metadata) |
| `post_type` | `post_type` (campo metadata) |
| `post_date` | `post_date` (campo metadata) |
| `hashtags` | `hashtags` (campo metadata) |
| `creative_instructions` | `creative_instructions` (campo metadata) |
| `notes` | Concatenado em `description` |
| `client_id` | Inserido em `task_clients` (junction table) |

**Mapeamento de status (post -> task):**

| Status Post | Status Task |
|---|---|
| `draft` | `todo` |
| `in_creation` | `in_progress` |
| `criados` | `in_progress` |
| `pending_approval` | `review` |
| `aguardando_cliente_aprovar` | `review` |
| `approved` | `review` |
| `scheduled` | `review` |
| `published` | `completed` |

### 2. Migration SQL - Migrar post_assignments para task_assignments

Para cada registro em `post_assignments`, criar um registro correspondente em `task_assignments` apontando para o novo `task_id`.

### 3. Migration SQL - Migrar relacao client_id para task_clients

Posts tem `client_id` direto. Tasks usam junction table `task_clients`. Para cada post com `client_id`, inserir um registro em `task_clients`.

### 4. Migration SQL - Depreciar tabela social_media_posts

- Renomear `social_media_posts` para `social_media_posts_deprecated`
- Renomear `post_assignments` para `post_assignments_deprecated`
- Isso preserva os dados historicos mas impede uso acidental

### 5. Limpar codigo frontend - Remover componentes legados

Arquivos a **deletar**:
- `src/hooks/useSocialMediaPosts.tsx`
- `src/hooks/usePostAssignments.tsx`
- `src/components/social-media/PostKanban.tsx`
- `src/components/social-media/PostKanbanColumn.tsx`
- `src/components/social-media/PostCard.tsx`
- `src/components/social-media/PostFormDialog.tsx`
- `src/components/social-media/PostDetailsDialog.tsx`
- `src/components/social-media/SortablePostCard.tsx`
- `src/components/social-media/PostDueDateBadge.tsx`
- `src/components/social-media/PostAssignedUsers.tsx`
- `src/components/ui/post-card-skeleton.tsx`

### 6. Atualizar MeetingContextTab.tsx

Este componente ainda faz query direta a `social_media_posts`. Atualizar para buscar da tabela `tasks` com `task_type = 'redes_sociais'` e usar `task_clients` para filtrar por cliente.

### 7. Atualizar process-notifications (Edge Function)

A edge function `process-notifications` tem 2 pontos que ainda leem de `social_media_posts`:

1. **Notificacao de posts proximos** (linhas ~490-620): Migrar para ler da tabela `tasks` com `task_type = 'redes_sociais'`, usando `task_assignments` em vez de `post_assignments`
2. **Daily digest - contagem de posts do dia** (linhas ~1167-1183): Migrar para contar tasks do tipo `redes_sociais` via `task_assignments`

### 8. Atualizar setup-demo-account (Edge Function)

Esta edge function cria posts demo em `social_media_posts`. Atualizar para criar tasks com `task_type = 'redes_sociais'` e inserir em `task_clients` e `task_assignments`.

### 9. Limpar triggers e functions do banco

Remover/atualizar:
- `notify_post_assignment()` - trigger que notifica atribuicoes de posts (substituido por `notify_task_assignment`)
- `notify_post_update_events()` - trigger de atualizacao de posts (substituido por `notify_task_update_events`)
- `apply_post_event_rules()` - function de regras de eventos de posts
- `archive_old_approved_posts()` - function de arquivamento automatico

## Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| Migration SQL | Migrar dados, renomear tabelas, remover triggers |
| `src/components/agenda/MeetingContextTab.tsx` | Query da tabela tasks |
| `supabase/functions/process-notifications/index.ts` | Queries da tabela tasks |
| `supabase/functions/setup-demo-account/index.ts` | Criar tasks em vez de posts |

## Arquivos deletados

| Arquivo |
|---|
| `src/hooks/useSocialMediaPosts.tsx` |
| `src/hooks/usePostAssignments.tsx` |
| `src/components/social-media/PostKanban.tsx` |
| `src/components/social-media/PostKanbanColumn.tsx` |
| `src/components/social-media/PostCard.tsx` |
| `src/components/social-media/PostFormDialog.tsx` |
| `src/components/social-media/PostDetailsDialog.tsx` |
| `src/components/social-media/SortablePostCard.tsx` |
| `src/components/social-media/PostDueDateBadge.tsx` |
| `src/components/social-media/PostAssignedUsers.tsx` |
| `src/components/ui/post-card-skeleton.tsx` |

## Riscos e mitigacao

- **Dados historicos**: As tabelas renomeadas (`_deprecated`) preservam todos os dados. Podem ser consultadas a qualquer momento e removidas definitivamente numa fase futura.
- **IDs diferentes**: Os posts migrados terao novos UUIDs na tabela tasks. Isso e necessario porque os IDs antigos podem colidir com IDs existentes em tasks.
- **Notificacoes duplicadas**: A migration remove os triggers antigos de posts antes de inserir os dados, evitando notificacoes espurias durante a migracao.
