

# Simplificacao do Dashboard e Notificacoes pos-unificacao

## Resumo

Agora que posts e tarefas vivem na mesma tabela `tasks`, o Dashboard e a tela de preferencias de notificacoes podem ser simplificados. No Dashboard, os blocos separados de "Meus Posts" e "Posts Solicitados" serao removidos -- seus itens serao absorvidos nos blocos unificados de "Minhas Tarefas" e "Tarefas Solicitadas". Na tela de notificacoes, a secao separada de "Posts (por evento)" sera unificada dentro da secao de "Tarefas".

---

## Alteracoes

### 1. Dashboard (Index.tsx) -- Unificar blocos

**Remover** os blocos separados de `MyPostsList` e `RequestedPostsList`. Os itens de `task_type = 'redes_sociais'` ja estao na tabela `tasks` e serao exibidos junto com as tarefas regulares.

Alteracoes concretas:
- Remover imports de `MyPostsList` e `RequestedPostsList`
- Remover state de `myPosts`, `myPostCustomStatuses`, `requestedPosts`
- Remover a query de `social_media_custom_statuses`
- Na fetch de tarefas, **nao filtrar** por `task_type` -- todas as tasks (regulares + redes_sociais) aparecem juntas
- Remover o grid de 2 colunas "Tarefas | Posts" e "Solicitadas | Posts Solicitados"
- Manter apenas um bloco `MyTasksList` em largura total
- Manter apenas um bloco `RequestedTasksList` em largura total
- Remover logica de `mapTaskStatusToSocial` do Index
- Nas metricas da agencia, simplificar removendo contagem separada de `totalSocialPosts` e `publishedPosts`

### 2. MyTasksList.tsx -- Adicionar icone

Adicionar um icone `ClipboardList` (ou similar) ao titulo "Minhas Tarefas" para ficar consistente com o icone `SendHorizontal` de "Tarefas Solicitadas".

### 3. Preferencias de Notificacao (NotificationPreferencesPage.tsx)

Simplificar a tela unificando posts e tarefas:

- **Secao "O que notificar"**: Remover o toggle separado de `posts_enabled` ("Posts de Social Media"). Posts sao tarefas agora.
- **Secao "Posts (por evento)"**: Remover o card inteiro. Os eventos `post.assigned`, `post.status_changed`, `post.updated_important` serao cobertos pelos equivalentes de tarefas.
- **Secao "Regras do time"**: Remover a regra separada "Notificar admins quando post for publicado" (ja coberta pela regra de tarefa concluida).
- Remover todo o state de `postEvents` e `agencyPostRules`
- Remover logica de save/fetch de `POST_EVENT_KEYS`

### 4. NotificationPreferences.tsx (modal legado)

Este componente modal e uma versao duplicada da pagina. Aplicar as mesmas simplificacoes ou, se nao for mais utilizado em nenhum lugar, deletar.

### 5. DashboardMetrics.tsx

Remover as metricas separadas de "Posts" (`totalSocialPosts`, `publishedPosts`) se existirem como cards distintos, ja que agora sao contados dentro de "Tarefas".

### 6. Limpeza de arquivos

Avaliar se `MyPostsList.tsx` e `RequestedPostsList.tsx` podem ser deletados, ja que nao serao mais usados no Dashboard.

---

## Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| `src/pages/Index.tsx` | Remover blocos de Posts, unificar fetch, simplificar metricas |
| `src/components/dashboard/MyTasksList.tsx` | Adicionar icone ao titulo |
| `src/components/notifications/NotificationPreferencesPage.tsx` | Remover secao Posts, unificar eventos |
| `src/components/notifications/NotificationPreferences.tsx` | Mesmas simplificacoes ou deletar |

## Arquivos possivelmente deletados

| Arquivo | Motivo |
|---|---|
| `src/components/dashboard/MyPostsList.tsx` | Nao mais utilizado |
| `src/components/dashboard/RequestedPostsList.tsx` | Nao mais utilizado |

---

## Detalhes tecnicos

### Index.tsx - Nova logica de fetch simplificada

A fetch de tarefas deixa de separar `regularTasks` vs `socialTasks`. Todas as tasks atribuidas ao usuario (independente de `task_type`) sao exibidas no bloco "Minhas Tarefas". O mesmo para tarefas criadas pelo usuario mas delegadas a terceiros em "Tarefas Solicitadas".

O filtro de visibilidade continua o mesmo: tarefas com `due_date` nos proximos 7 dias e nao concluidas. Para tarefas de redes sociais sem `due_date` mas com `metadata.post_date`, o campo `due_date` devera ser utilizado (ja mapeado na migracao).

### NotificationPreferencesPage.tsx - Eventos unificados

Os event keys ficam apenas:
- `task.assigned`
- `task.status_changed`
- `task.updated_important`
- `task.comment_added` (em breve)

Os event keys `post.*` deixam de ser salvos/lidos. Registros existentes na tabela `notification_event_preferences` com `post.*` permanecem mas sao ignorados.

