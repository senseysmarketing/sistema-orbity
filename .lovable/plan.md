

# Incluir Reuniões no Resumo Diário

## Objetivo

Adicionar contagem de reuniões no resumo diário, verificando se o usuário é organizador OU participante da reunião.

---

## Como Funciona a Vinculação de Usuários em Reuniões

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `organizer_id` | UUID | ID do usuário que criou/organiza a reunião |
| `participants` | JSONB (array) | Array de UUIDs dos participantes internos |

Um usuário está vinculado a uma reunião se:
- `organizer_id = user_id` **OU**
- `participants` contém o `user_id`

---

## Mudanças no Código

### Arquivo: `supabase/functions/process-notifications/index.ts`

Adicionar uma terceira contagem (reuniões) dentro do loop de usuários:

```typescript
// Após contar posts, contar reuniões do usuário para hoje
// Reunião onde o usuário é organizador OU participante
const { count: userMeetingsCount, error: meetingsError } = await supabase
  .from('meetings')
  .select('id', { count: 'exact', head: true })
  .eq('agency_id', agency.id)
  .eq('status', 'scheduled')
  .gte('start_time', todayBrasilia.toISOString())
  .lte('start_time', endOfDayBrasilia.toISOString())
  .or(`organizer_id.eq.${user.user_id},participants.cs.["${user.user_id}"]`);

if (meetingsError) {
  console.error(`Error counting meetings for user ${user.user_id}:`, meetingsError);
}

const meetingsCount = userMeetingsCount || 0;
```

### Atualizar Mensagem e Metadados

```typescript
const tasksCount = userTasksCount || 0;
const postsCount = userPostsCount || 0;
const meetingsCount = userMeetingsCount || 0;
const totalItems = tasksCount + postsCount + meetingsCount;

// Build personalized message
let message = '📋 Resumo do dia: ';
const parts = [];

if (tasksCount > 0) {
  parts.push(`${tasksCount} tarefa${tasksCount > 1 ? 's' : ''}`);
}

if (postsCount > 0) {
  parts.push(`${postsCount} post${postsCount > 1 ? 's' : ''}`);
}

if (meetingsCount > 0) {
  parts.push(`${meetingsCount} reunião${meetingsCount > 1 ? 'ões' : ''}`);
}

message += parts.join(', ').replace(/, ([^,]+)$/, ' e $1') + ' para hoje';

// Determinar URL de ação (prioridade: reuniões > tarefas > posts)
let actionUrl = '/dashboard';
if (meetingsCount > 0) {
  actionUrl = '/agenda';
} else if (tasksCount > 0) {
  actionUrl = '/tasks';
} else if (postsCount > 0) {
  actionUrl = '/social-media';
}

// Metadados atualizados
metadata: { 
  tasks_count: tasksCount,
  posts_count: postsCount,
  meetings_count: meetingsCount,  // Novo
  date: todayBrasilia.toISOString(),
  play_sound: false
}
```

---

## Exemplos de Mensagens Geradas

| Cenário | Mensagem |
|---------|----------|
| 3 tarefas, 2 posts, 1 reunião | "📋 Resumo do dia: 3 tarefas, 2 posts e 1 reunião para hoje" |
| 1 tarefa, 0 posts, 2 reuniões | "📋 Resumo do dia: 1 tarefa e 2 reuniões para hoje" |
| 0 tarefas, 1 post, 0 reuniões | "📋 Resumo do dia: 1 post para hoje" |
| 0 tarefas, 0 posts, 1 reunião | "📋 Resumo do dia: 1 reunião para hoje" |
| 0 tarefas, 0 posts, 0 reuniões | "Bom dia! Sua agenda está livre..." (após implementar a mensagem de bom dia) |

---

## Consulta SQL para Reuniões

A query usa o operador `or` do Supabase para verificar:

```sql
-- Reunião onde usuário é organizador OU participante
WHERE agency_id = 'xxx'
  AND status = 'scheduled'
  AND start_time >= '2024-01-15 00:00:00'
  AND start_time <= '2024-01-15 23:59:59'
  AND (
    organizer_id = 'user-uuid'
    OR participants @> '["user-uuid"]'
  )
```

O operador `@>` (contains) verifica se o array JSONB contém o UUID.

---

## URL de Ação Priorizada

Para direcionar o usuário ao lugar mais relevante:

| Prioridade | Condição | URL |
|------------|----------|-----|
| 1 | Tem reuniões | `/agenda` |
| 2 | Tem tarefas (sem reuniões) | `/tasks` |
| 3 | Tem posts (sem tarefas/reuniões) | `/social-media` |
| 4 | Sem atribuições | `/dashboard` |

---

## Resumo das Mudanças

| Aspecto | Detalhes |
|---------|----------|
| **Arquivo** | `supabase/functions/process-notifications/index.ts` |
| **Função** | `processDailySummary()` |
| **Nova query** | Contar reuniões onde `organizer_id = user` OU `participants` contém `user` |
| **Mensagem** | Incluir contagem de reuniões |
| **URL de ação** | Priorizar `/agenda` quando há reuniões |
| **Metadados** | Adicionar `meetings_count` |

