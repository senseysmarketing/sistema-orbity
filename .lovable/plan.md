

# Fase 2: Espelhamento no Social Media — Ler da tabela `tasks`

## Resumo

A tela de Social Media deixa de ler da tabela `social_media_posts` e passa a consumir dados da tabela `tasks` filtrados por `task_type = 'redes_sociais'`. O Kanban de posts e removido (fica apenas na tela de Tarefas). Calendario, Planejamento Semanal, Analises e Configuracoes sao mantidos.

## Mudanca conceitual

```text
ANTES:
  Social Media -> useSocialMediaPosts() -> social_media_posts table
  Tasks        -> tasks table

DEPOIS:
  Social Media -> useSocialMediaTasks() -> tasks table (WHERE task_type = 'redes_sociais')
  Tasks        -> tasks table (todos os tipos)
```

## Alteracoes detalhadas

### 1. Novo hook: `useSocialMediaTasks.tsx`

Criar um hook que busca tarefas do tipo `redes_sociais` da tabela `tasks` e as formata para uma interface compativel com os componentes de Social Media existentes.

**Dados buscados:**
- `tasks` com `task_type = 'redes_sociais'` e `agency_id = currentAgency.id`
- Join com `clients(name)` via `task_clients` (junction table)
- Join com `task_assignments(user_id)` para usuarios atribuidos
- Profiles dos usuarios para nomes

**Interface de saida (`SocialMediaTask`):**
Mapeamento dos campos da task para os campos que o Calendario e Planejamento esperam:

| Campo Social Media | Campo Task |
|---|---|
| `id` | `id` |
| `title` | `title` |
| `description` | `description` |
| `client_id` | Derivado de `task_clients` |
| `client_name` | Via join |
| `scheduled_date` | `post_date` (data de publicacao) ou `due_date` como fallback |
| `post_date` | `post_date` |
| `due_date` | `due_date` |
| `post_type` | `post_type` |
| `platform` | `platform` |
| `status` | `status` (mapeado para os status de social media) |
| `priority` | `priority` |
| `hashtags` | `hashtags` |
| `creative_instructions` | `creative_instructions` |
| `assigned_users` | Via `task_assignments` + profiles |
| `archived` | Derivado de status `completed`/`done` |

**Mapeamento de status Tasks -> Social Media:**
Os status de tarefas precisam ser traduzidos para o vocabulario de Social Media:

| Status Task | Mapeamento Social |
|---|---|
| `todo` / `pending` | `draft` (Briefing) |
| `in_progress` | `in_creation` (Em Criacao) |
| `review` / `revision` | `pending_approval` |
| `completed` / `done` | `published` |
| Status customizados | Manter como estao |

### 2. Atualizar `SocialMediaCalendar.tsx`

- Trocar `useSocialMediaPosts` por `useSocialMediaTasks`
- Remover `PostFormDialog` e `PostDetailsDialog` — ao clicar num item do calendario, redirecionar para a tela de Tarefas ou abrir o `TaskDetailsDialog`
- O botao "Nova Postagem" redireciona para criacao de tarefa com tipo pre-selecionado `redes_sociais`
- Adaptar campos: usar `post_date || due_date` como data de exibicao no calendario

### 3. Atualizar `WeeklyPlanningView.tsx`

- Trocar `useSocialMediaPosts` por `useSocialMediaTasks`
- O botao "Criar Post" no painel lateral passa a navegar para criacao de tarefa com tipo `redes_sociais` e cliente pre-selecionado
- Ao clicar em "Ver Post", abre `TaskDetailsDialog` em vez de `PostDetailsDialog`
- Adaptar a logica de categorize status para os status de task

### 4. Atualizar `planning/types.ts`

- Trocar referencia de `SocialMediaPost` para `SocialMediaTask` (do novo hook)
- Ajustar `STATUS_CATEGORIES` para incluir status de tasks (`todo`, `in_progress`, `review`, `completed`)
- Ajustar `categorizeStatus` para funcionar com os status da tabela de tasks

### 5. Atualizar `ClientWeekRow.tsx` e `ClientPlanningDetails.tsx`

- Trocar tipo `SocialMediaPost` por `SocialMediaTask`
- Ajustar campos referenciados (ex: `post.post_date || post.scheduled_date` -> `task.post_date || task.due_date`)

### 6. Atualizar `SocialMediaAnalytics.tsx`

- Trocar queries de `social_media_posts` para `tasks` com filtro `task_type = 'redes_sociais'`
- Ajustar campos: `scheduled_date` -> `post_date` ou `due_date`
- Ajustar `post_assignments` -> `task_assignments`

### 7. Remover aba Kanban da pagina `SocialMedia.tsx`

- Remover tab "Kanban" e o import de `PostKanban`
- Remover o botao "Novo Post" que aparecia apenas na aba Kanban
- A pagina fica com 4 abas: Planejamento, Calendario, Analises, Configuracoes

### 8. Atualizar `ClientPosts.tsx` (detalhe do cliente)

- Trocar query de `social_media_posts` para `tasks` com `task_type = 'redes_sociais'`
- Usar junction table `task_clients` em vez de `post_clients`
- Manter a mesma interface visual

### 9. Atualizar `DayTimeline.tsx` (dashboard)

- Trocar queries de `social_media_posts` para `tasks` com `task_type = 'redes_sociais'`
- Ajustar campos para os da tabela tasks

### 10. Atualizar `MyPostsList.tsx` (dashboard)

- Se este componente recebe posts externamente, garantir que o componente pai passe tarefas `redes_sociais` em vez de posts da tabela antiga

### 11. Atualizar `DayCell.tsx`

- Trocar tipo para `SocialMediaTask`
- Manter logica visual inalterada

## Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| `src/hooks/useSocialMediaTasks.tsx` | **NOVO** - Hook que le tasks tipo redes_sociais |
| `src/pages/SocialMedia.tsx` | Remover aba Kanban e botao Novo Post |
| `src/components/social-media/SocialMediaCalendar.tsx` | Usar novo hook, redirecionar para Tasks |
| `src/components/social-media/WeeklyPlanningView.tsx` | Usar novo hook, redirecionar para Tasks |
| `src/components/social-media/planning/types.ts` | Trocar tipo e ajustar categorias de status |
| `src/components/social-media/planning/ClientWeekRow.tsx` | Trocar tipo |
| `src/components/social-media/planning/ClientPlanningDetails.tsx` | Trocar tipo e acoes |
| `src/components/social-media/planning/DayCell.tsx` | Trocar tipo |
| `src/components/social-media/planning/PlanningMetrics.tsx` | Trocar tipo |
| `src/components/social-media/SocialMediaAnalytics.tsx` | Queries da tabela tasks |
| `src/components/social-media/analytics/*.tsx` | Trocar tipos |
| `src/components/clients/ClientPosts.tsx` | Query da tabela tasks |
| `src/components/clients/ClientOverview.tsx` | Query da tabela tasks |
| `src/components/dashboard/DayTimeline.tsx` | Query da tabela tasks |

## O que NAO sera alterado nesta fase

- **PostFormDialog, PostDetailsDialog, PostCard, PostKanban, SortablePostCard, PostKanbanColumn**: Estes componentes continuam existindo no codigo mas nao serao mais referenciados pela tela de Social Media. Poderao ser removidos numa fase futura de limpeza.
- **useSocialMediaPosts hook**: Permanece no codigo para nao quebrar nada, sera removido numa fase futura.
- **Tabela social_media_posts**: Os dados existentes permanecem intocados. A migracao de dados historicos pode ser feita numa fase futura.
- **SocialMediaSettings**: Permanece inalterado — continua gerenciando status customizados, tipos de conteudo e plataformas.

## Consideracoes tecnicas

### Mapeamento de status

A tabela `tasks` usa status como `todo`, `in_progress`, `review`, `completed` e tambem status customizados da agencia. O calendario e planejamento de Social Media categorizam status em 3 grupos (ready, inProgress, draft). A funcao `categorizeStatus` sera atualizada para reconhecer ambos os vocabularios.

### Relacao tarefa-cliente

A tabela `tasks` usa a junction table `task_clients` para a relacao N:N com clientes. O Planejamento Semanal agrupa por cliente, entao uma tarefa vinculada a multiplos clientes aparecera em cada linha de cliente.

### Navegacao entre modulos

Ao clicar num post no calendario ou planejamento, o usuario sera redirecionado para a tela de Tarefas (ou abrira o TaskDetailsDialog inline). Isso reforça a unificacao — toda a execucao acontece em Tarefas.

