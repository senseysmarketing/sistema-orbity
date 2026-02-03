

# Correção: Notificar Criador + Usuários Atribuídos ao Post

## Objetivo

Alterar a lógica de notificação "Post próximo de publicar" para enviar para:
1. **O criador do post** (sempre)
2. **Usuários atribuídos ao post** (via tabela `post_assignments`)

Sem duplicatas - se o criador também estiver atribuído, recebe apenas 1 notificação.

---

## Situação Atual

A query atual busca **todos os usuários da agência** através do join com `agency_users`, resultando em spam para todos.

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/process-notifications/index.ts` | Alterar query e lógica de destinatários |

---

## Implementação

### 1. Alterar Query (linhas 499-513)

De:
```typescript
.select(`
    id, title, scheduled_date, post_date, agency_id, notification_sent_at,
    agencies!inner(
      agency_users(user_id)
    )
  `)
```

Para:
```typescript
.select(`
    id, title, scheduled_date, post_date, agency_id, created_by,
    notification_sent_at,
    post_assignments(user_id)
  `)
```

---

### 2. Alterar Lógica de Destinatários (linhas 532-575)

De:
```typescript
const agencyUsers = (post.agencies as any)?.agency_users || [];
for (const user of agencyUsers) { ... }
```

Para:
```typescript
// Pegar usuários atribuídos ao post
const assignedUserIds = (post.post_assignments || []).map((a: any) => a.user_id);

// Combinar criador + atribuídos (sem duplicatas)
const recipientSet = new Set<string>();

// Sempre adicionar o criador
if (post.created_by) {
  recipientSet.add(post.created_by);
}

// Adicionar todos os atribuídos
for (const userId of assignedUserIds) {
  recipientSet.add(userId);
}

const recipients = Array.from(recipientSet);

// Enviar para cada destinatário único
for (const userId of recipients) {
  // ... lógica de notificação existente (substituir user.user_id por userId)
}
```

---

### 3. Ajustar Condição de Atualização (linha 572-574)

De:
```typescript
if (agencyUsers.length > 0) {
  postsToUpdate.push(post.id);
}
```

Para:
```typescript
if (recipients.length > 0) {
  postsToUpdate.push(post.id);
}
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Todos da agência recebem | Apenas criador + atribuídos recebem |
| Spam para toda equipe | Notificação direcionada |

---

## Fluxo de Decisão

```text
Post próximo de publicar?
    │
    ▼
Combinar destinatários únicos:
    ├── Criador do post (sempre incluído)
    └── Usuários atribuídos ao post
    │
    ▼
Notificar cada um (sem duplicatas)
```

---

## Exemplo Prático

| Cenário | Quem recebe |
|---------|-------------|
| Criador: Ana, Atribuídos: [Bruno, Carlos] | Ana, Bruno, Carlos (3 notificações) |
| Criador: Ana, Atribuídos: [Ana, Bruno] | Ana, Bruno (2 notificações - Ana não duplica) |
| Criador: Ana, Atribuídos: [] | Ana (1 notificação) |
| Criador: null, Atribuídos: [Bruno] | Bruno (1 notificação) |

