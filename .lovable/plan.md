
# Fase 3: Migração de dados e limpeza — ✅ CONCLUÍDA

## O que foi feito

1. **Migration SQL executada**: 493 posts migrados de `social_media_posts` para `tasks` com `task_type = 'redes_sociais'`
2. **post_assignments migrados**: Todos redirecionados para `task_assignments`
3. **client_id migrado**: Relações movidas para `task_clients` (junction table)
4. **Tabelas depreciadas**: `social_media_posts` → `social_media_posts_deprecated`, `post_assignments` → `post_assignments_deprecated`
5. **Triggers e functions removidos**: `notify_post_assignment`, `notify_post_update_events`, `apply_post_event_rules`, `archive_old_approved_posts`
6. **11 arquivos frontend deletados**: hooks e componentes Post* legados
7. **MeetingContextTab atualizado**: Query via `task_clients` + `tasks`
8. **ClientOverview atualizado**: Query via `task_clients` + `tasks`
9. **process-notifications atualizado**: Usa `tasks` com `task_type = 'redes_sociais'` e `task_assignments`
10. **setup-demo-account atualizado**: Cria tasks em vez de posts na tabela legada

## Status atual

O sistema opera 100% na tabela `tasks`. As tabelas depreciadas permanecem para consulta histórica e podem ser removidas definitivamente no futuro.
