# Excluir o Autor da Ação das Notificações de Status ✅

## Implementação Concluída

### Mudanças de Banco de Dados

1. **Novas colunas `updated_by`** adicionadas às tabelas:
   - `tasks.updated_by UUID`
   - `social_media_posts.updated_by UUID`

2. **Triggers atualizados** para excluir quem fez a ação:
   - `notify_task_update_events()` - verifica `NEW.updated_by` e pula notificação para esse usuário
   - `notify_post_update_events()` - mesma lógica para posts

### Mudanças no Frontend

1. **`src/hooks/useSocialMediaPosts.tsx`** - `updatePost()` agora passa `updated_by: userId`
2. **`src/pages/Tasks.tsx`** - Dois locais de update agora passam `updated_by: profile?.user_id`:
   - Drag-and-drop no Kanban (handleDragEnd)
   - Edição via diálogo (handleUpdateTask)

---

## Comportamento Final

| Cenário | Quem recebe notificação |
|---------|------------------------|
| João move tarefa para "Concluído" | Maria (criadora), Pedro (outro atribuído) - **João NÃO recebe** |
| Maria publica post | João (outro atribuído) - **Maria NÃO recebe** |
| Sistema atualiza sem `updated_by` (null) | Todos recebem (fallback seguro) |
