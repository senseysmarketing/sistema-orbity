

# Correção: Resumo Diário Personalizado por Usuário

## Problema Identificado

### 1. Texto "from Orbity" em Inglês
O texto "from Orbity" que aparece nas notificações push é adicionado automaticamente pelo sistema operacional (macOS, iOS, Windows, Android) ou navegador. Isso **NÃO está no nosso código** e **não pode ser alterado**.

O sistema usa:
- O nome do domínio (`sistema-orbity.lovable.app`)
- O nome do PWA definido no manifest (`"short_name": "Orbity"`)

**Conclusão**: Infelizmente não há como mudar "from" para "de" pois é controlado pelo OS/browser, não pelo nosso código.

---

### 2. Resumo Diário Mostrando Dados de Toda a Agência

O código atual em `process-notifications/index.ts` faz:

```typescript
// Conta TODAS as tarefas da agência
const { count: tasksCount } = await supabase
  .from('tasks')
  .select('*', { count: 'exact', head: true })
  .eq('agency_id', agency.id)  // <-- Filtra só por agência
  .neq('status', 'done')
  ...

// Envia mesmo resumo para TODOS os usuários
for (const user of agencyUsers || []) {
  message = `${tasksCount} tarefas e ${postsCount} posts`; // <-- Mesmo número para todos
}
```

**Problema**: Todos os usuários recebem a mesma contagem, independente do que está atribuído a eles.

---

## Solução Proposta

### Modificar `process-notifications/index.ts`

Alterar a função `processDailySummary()` para:

1. **Para cada usuário**, contar apenas:
   - Tarefas onde ele está em `task_assignments`
   - Posts onde ele está em `post_assignments`

2. **Estrutura corrigida**:

```typescript
for (const agency of agencies || []) {
  // Pegar todos os usuários da agência
  const { data: agencyUsers } = await supabase
    .from('agency_users')
    .select('user_id')
    .eq('agency_id', agency.id);

  for (const user of agencyUsers || []) {
    // Contar tarefas ATRIBUÍDAS a este usuário específico
    const { count: userTasksCount } = await supabase
      .from('task_assignments')
      .select('task_id, tasks!inner(id, due_date, status, archived)', { count: 'exact', head: true })
      .eq('user_id', user.user_id)
      .eq('tasks.agency_id', agency.id)
      .eq('tasks.archived', false)
      .neq('tasks.status', 'done')
      .gte('tasks.due_date', todayBrasilia.toISOString())
      .lte('tasks.due_date', endOfDayBrasilia.toISOString());

    // Contar posts ATRIBUÍDOS a este usuário específico
    const { count: userPostsCount } = await supabase
      .from('post_assignments')
      .select('post_id, social_media_posts!inner(id, scheduled_date, archived)', { count: 'exact', head: true })
      .eq('user_id', user.user_id)
      .eq('social_media_posts.agency_id', agency.id)
      .eq('social_media_posts.archived', false)
      .gte('social_media_posts.scheduled_date', todayBrasilia.toISOString())
      .lte('social_media_posts.scheduled_date', endOfDayBrasilia.toISOString());

    const totalItems = (userTasksCount || 0) + (userPostsCount || 0);

    // Só enviar se o usuário tiver algo atribuído
    if (totalItems > 0) {
      // Criar notificação personalizada...
    }
  }
}
```

---

## Detalhes Técnicos

### Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `supabase/functions/process-notifications/index.ts` | Modificar `processDailySummary()` para filtrar por usuário |

### Lógica de Contagem por Usuário

```text
ANTES (incorreto):
┌───────────────────────────────────────────────────────────┐
│ Agência A                                                  │
├───────────────────────────────────────────────────────────┤
│ Total: 10 tarefas, 5 posts                                │
│                                                           │
│ User 1 recebe: "10 tarefas e 5 posts para hoje"           │
│ User 2 recebe: "10 tarefas e 5 posts para hoje"           │
│ User 3 recebe: "10 tarefas e 5 posts para hoje"           │
└───────────────────────────────────────────────────────────┘

DEPOIS (correto):
┌───────────────────────────────────────────────────────────┐
│ Agência A                                                  │
├───────────────────────────────────────────────────────────┤
│ User 1 (atribuído a 3 tarefas, 2 posts):                  │
│   recebe: "3 tarefas e 2 posts para hoje"                 │
│                                                           │
│ User 2 (atribuído a 5 tarefas, 1 post):                   │
│   recebe: "5 tarefas e 1 post para hoje"                  │
│                                                           │
│ User 3 (atribuído a 2 tarefas, 0 posts):                  │
│   recebe: "2 tarefas para hoje"                           │
│                                                           │
│ User 4 (sem atribuições):                                 │
│   NÃO recebe notificação                                  │
└───────────────────────────────────────────────────────────┘
```

---

## Consideração sobre Performance

A nova abordagem faz mais queries (uma por usuário ao invés de uma por agência), mas:
- O número de usuários por agência geralmente é pequeno (5-20)
- As queries usam índices existentes em `task_assignments` e `post_assignments`
- O processo roda uma vez por dia, então não há impacto significativo

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Usuário com 3 tarefas atribuídas | "10 tarefas para hoje" (total agência) | "3 tarefas para hoje" (apenas suas) |
| Usuário sem tarefas atribuídas | "10 tarefas para hoje" | Não recebe notificação |
| Resumo por usuário | Todos recebem igual | Cada um recebe personalizado |

---

## Nota sobre "from Orbity"

Conforme mencionado, o texto "from Orbity" é controlado pelo sistema operacional/navegador e não pode ser alterado pelo nosso código. Algumas alternativas que poderiam ser exploradas no futuro:
- Mudar o `short_name` no manifest para algo em português (mas isso afetaria outros lugares)
- Hospedar em um domínio `.com.br` (mas o "from" ainda apareceria em inglês)

**Recomendação**: Manter como está, pois é um padrão do sistema que os usuários já estão acostumados.

