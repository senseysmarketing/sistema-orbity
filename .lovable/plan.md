

# Correção: Notificar Apenas Usuários Atribuídos ao Post

## Objetivo

Alterar a lógica de notificação "Post próximo de publicar" para enviar apenas para:
1. **Usuários atribuídos ao post** (via tabela `post_assignments`)
2. **Fallback para o criador** se ninguém estiver atribuído

## Situação Atual

A query atual (linhas 499-511) busca **todos os usuários da agência** através do join:
```typescript
agencies!inner(
  agency_users(user_id)
)
```

Isso resulta em TODOS os membros da agência recebendo notificação para CADA post.

---

## Solução Proposta

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/process-notifications/index.ts` | Alterar query e lógica de destinatários |

---

## Implementação

### 1. Alterar Query para Buscar Atribuições e Criador (linhas 499-513)

De:
```typescript
const { data: posts, error } = await supabase
  .from('social_media_posts')
  .select(`
    id,
    title,
    scheduled_date,
    post_date,
    agency_id,
    notification_sent_at,
    agencies!inner(
      agency_users(user_id)
    )
  `)
```

Para:
```typescript
const { data: posts, error } = await supabase
  .from('social_media_posts')
  .select(`
    id,
    title,
    scheduled_date,
    post_date,
    agency_id,
    created_by,
    notification_sent_at,
    post_assignments(user_id)
  `)
```

---

### 2. Alterar Lógica de Destinatários (linhas 532-570)

De:
```typescript
const agencyUsers = (post.agencies as any)?.agency_users || [];
// ... loop por todos os usuários da agência
```

Para:
```typescript
// Pegar usuários atribuídos ao post
const assignedUsers = (post.post_assignments || []).map((a: any) => a.user_id);

// Fallback para o criador se ninguém estiver atribuído
const recipients = assignedUsers.length > 0 
  ? assignedUsers 
  : (post.created_by ? [post.created_by] : []);

// Enviar apenas para os destinatários relevantes
for (const userId of recipients) {
  // ... lógica de notificação existente
}
```

---

### 3. Ajustar Condição de Atualização (linhas 572-574)

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
| Todos da agência recebem notificação | Apenas atribuídos (ou criador) recebem |
| Spam de notificações para todos | Notificação direcionada e relevante |

---

## Fluxo de Decisão

```text
Post próximo de publicar?
    │
    ▼
Tem usuários atribuídos?
    │
    ├── SIM → Notifica apenas os atribuídos
    │
    └── NÃO → Notifica o criador do post
```

---

## Resumo das Alterações

1. **Query**: Remover join com `agency_users`, adicionar join com `post_assignments` e campo `created_by`
2. **Lógica**: Usar atribuídos com fallback para criador
3. **Condição**: Ajustar verificação para usar `recipients` em vez de `agencyUsers`

