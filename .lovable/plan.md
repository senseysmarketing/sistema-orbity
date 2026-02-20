
# Novos Blocos: Tarefas Solicitadas e Posts Solicitados no Dashboard

## Conceito

Dois novos blocos aparecem logo abaixo de "Minhas Tarefas" e "Meus Posts", formando um segundo grid 2 colunas. Eles mostram o que o usuário delegou para outros membros da equipe — permitindo acompanhar o progresso sem precisar ir até a tela de tarefas ou social media.

- **Tarefas Solicitadas**: tarefas criadas pelo usuário (`created_by = user_id`) mas atribuídas a outra pessoa
- **Posts Solicitados**: posts criados pelo usuário (`created_by = user_id`) mas atribuídos a outra pessoa

## Lógica de Dados

### Tarefas Solicitadas
```
tasks WHERE created_by = profile.user_id
  AND id NOT IN (task_assignments WHERE user_id = profile.user_id)
  AND status != 'done'
  AND archived = false
```
Ou seja: tarefas que eu criei mas não estou executando eu mesmo. Exibe: título, responsável(eis), prazo, prioridade, status.

### Posts Solicitados
```
social_media_posts WHERE created_by = profile.user_id
  AND id NOT IN (post_assignments WHERE user_id = profile.user_id)
  AND status != 'published'
  AND archived = false
```
Exibe: título, responsável(eis), data agendada, status, plataforma.

## Novos Componentes

### `src/components/dashboard/RequestedTasksList.tsx`
Componente espelhado no `MyTasksList` mas com diferenças visuais:
- Título: **"Tarefas Solicitadas"** com ícone `SendHorizontal`
- Cada linha mostra: título da tarefa + nome(s) do(s) responsável(eis) atribuído(s) + badge de prioridade + prazo
- Seções: Atrasadas / Hoje / Esta Semana (mesma lógica)
- Estado vazio: "Nenhuma tarefa solicitada pendente"
- Sem checkbox de completar (o usuário não é o executor)

### `src/components/dashboard/RequestedPostsList.tsx`
Componente espelhado no `MyPostsList` com diferenças visuais:
- Título: **"Posts Solicitados"** com ícone `SendHorizontal`
- Cada linha mostra: título do post + nome(s) do(s) responsável(eis) + badge de status + data agendada
- Seções: Atrasados / Hoje / Esta Semana / Pendentes (mesma lógica)
- Estado vazio: "Nenhum post solicitado pendente"

## Mudanças em `Index.tsx`

### Novos estados
```typescript
const [requestedTasks, setRequestedTasks] = useState<any[]>([]);
const [requestedPosts, setRequestedPosts] = useState<any[]>([]);
```

### Dentro de `fetchMyData`
Buscar tarefas criadas pelo usuário logado que não estão nos seus próprios task_assignments:
```typescript
// Tarefas solicitadas pelo usuário (criadas mas não auto-atribuídas)
const { data: createdTasks } = await supabase
  .from('tasks')
  .select('*, clients(name), task_assignments(user_id, profiles(name))')
  .eq('agency_id', currentAgency.id)
  .eq('created_by', profile.user_id)
  .neq('status', 'done')
  .eq('archived', false);

// Filtrar fora as que o próprio usuário também executa
const filteredRequestedTasks = (createdTasks || []).filter(t =>
  !myTaskIds.includes(t.id)
);
setRequestedTasks(filteredRequestedTasks);

// Posts solicitados (criados mas não auto-atribuídos)
const { data: createdPosts } = await supabase
  .from('social_media_posts')
  .select('*, clients(name), post_assignments(user_id, profiles(name))')
  .eq('agency_id', currentAgency.id)
  .eq('created_by', profile.user_id)
  .neq('status', 'published')
  .eq('archived', false);

const filteredRequestedPosts = (createdPosts || []).filter(p =>
  !myPostIds.includes(p.id)
);
setRequestedPosts(filteredRequestedPosts);
```

### No JSX — novo grid abaixo do grid de Tarefas/Posts
```jsx
{/* 5. Grid: Tarefas Solicitadas | Posts Solicitados */}
<div className="grid gap-4 md:grid-cols-2">
  <RequestedTasksList
    tasks={requestedTasks}
    onViewAll={() => navigate('/dashboard/tasks')}
  />
  <RequestedPostsList
    posts={requestedPosts}
    customStatuses={myPostCustomStatuses}
    onViewAll={() => navigate('/dashboard/social-media')}
  />
</div>
```

## Exibição dos Responsáveis

Cada linha nos novos blocos mostra o nome de quem está executando (via join com `task_assignments → profiles`):

```
[✉] Reels da Semana                    [Em Criação]
     Maria Silva • 28 fev
```

Se não houver ninguém atribuído ainda: exibe "Sem responsável" em cinza.

## Arquivos Modificados/Criados

| Arquivo | Operação |
|---|---|
| `src/components/dashboard/RequestedTasksList.tsx` | Criar |
| `src/components/dashboard/RequestedPostsList.tsx` | Criar |
| `src/pages/Index.tsx` | Editar — novos estados, nova query, novo grid no JSX |

## Ordem Final do Dashboard

1. Header "Meu Dia"
2. Banner próxima reunião
3. Bloco de Notas + Linha do Tempo
4. Rotinas
5. Minhas Tarefas + Meus Posts
6. **Tarefas Solicitadas + Posts Solicitados** (NOVO)
7. Ações Rápidas
8. Métricas da Agência (admin)
