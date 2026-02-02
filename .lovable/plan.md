

# Ajuste das Notificações "Post Próximo de Publicar"

## Problema Atual

O sistema de notificações de posts próximos de publicar está usando o campo **`scheduled_date`** (que é o campo legado mantido por compatibilidade), enquanto agora existem dois campos distintos:

| Campo | Significado | Uso Correto |
|-------|-------------|-------------|
| `due_date` | Data limite para a arte ficar pronta | Notificar responsáveis pela criação |
| `post_date` | Data real de publicação do conteúdo | **Notificação "próximo de publicar"** |
| `scheduled_date` | Campo legado (atualmente sincronizado com post_date) | Manter por compatibilidade |

### Problemas identificados:

1. **Campo errado**: A edge function `process-notifications` usa `scheduled_date` em vez de `post_date`
2. **Tempo incorreto**: Notifica 3 horas antes (padrão do `post_advance_hours`) em vez de 1 hora antes
3. **Reset de notificação**: O hook `useSocialMediaPosts` reseta `notification_sent_at` apenas quando `scheduled_date` muda, mas deveria resetar quando `post_date` muda

---

## Solução

### Arquivo 1: `supabase/functions/process-notifications/index.ts`

Modificar a função `processPosts()` para:

1. Buscar e usar o campo `post_date` em vez de `scheduled_date`
2. Alterar a lógica de tempo para 1 hora antes
3. Tratar casos onde `post_date` é null (fallback para `scheduled_date`)

#### Mudanças na query (linha ~499):

```typescript
// Antes
.select(`
  id,
  title,
  scheduled_date,
  agency_id,
  notification_sent_at,
  agencies!inner(...)
`)
.gte('scheduled_date', now.toISOString())

// Depois
.select(`
  id,
  title,
  scheduled_date,
  post_date,
  agency_id,
  notification_sent_at,
  agencies!inner(...)
`)
// Filtrar posts com post_date futuro (ou scheduled_date como fallback)
```

#### Mudanças na lógica de tempo (linha ~531-537):

```typescript
// Antes
const advanceHours = prefs?.post_advance_hours ?? 3;
const scheduledDate = new Date(post.scheduled_date);
const notificationTime = addHours(now, advanceHours);

if (scheduledDate <= notificationTime) {
  // cria notificação
}

// Depois
const ADVANCE_HOURS = 1; // Fixo: 1 hora antes
const postDate = new Date(post.post_date || post.scheduled_date); // Usar post_date com fallback
const notificationTime = addHours(now, ADVANCE_HOURS);

if (postDate <= notificationTime) {
  // cria notificação
}
```

---

### Arquivo 2: `src/hooks/useSocialMediaPosts.tsx`

Ajustar o reset do `notification_sent_at` para considerar também quando `post_date` muda.

#### Mudança na função `updatePost` (linha ~249-259):

```typescript
// Antes: só verifica scheduled_date
if (updates.scheduled_date) {
  const originalPost = posts.find(p => p.id === id);
  if (originalPost && originalPost.scheduled_date !== updates.scheduled_date) {
    finalUpdates.notification_sent_at = null;
  }
}

// Depois: verifica post_date também
const originalPost = posts.find(p => p.id === id);
if (originalPost) {
  const postDateChanged = updates.post_date && originalPost.post_date !== updates.post_date;
  const scheduledDateChanged = updates.scheduled_date && originalPost.scheduled_date !== updates.scheduled_date;
  
  if (postDateChanged || scheduledDateChanged) {
    finalUpdates.notification_sent_at = null;
  }
}
```

---

## Comportamento Final

| Antes | Depois |
|-------|--------|
| Usa `scheduled_date` | Usa `post_date` (com fallback para `scheduled_date`) |
| Notifica 3 horas antes | Notifica **1 hora antes** |
| Reset só quando `scheduled_date` muda | Reset quando `post_date` ou `scheduled_date` muda |

---

## Fluxo de Notificação

```text
1. Post criado com post_date = 14:00
2. Cron roda a cada hora verificando posts
3. Às 13:00:
   - Calcula: 13:00 + 1h = 14:00
   - post_date (14:00) <= 14:00 ✓
   - Notificação enviada: "📱 Post próximo de publicar"
4. Post aparece com título e link para /social-media
```

---

## Resumo das Mudanças

| Arquivo | Ação |
|---------|------|
| `supabase/functions/process-notifications/index.ts` | Usar `post_date`, notificar 1h antes |
| `src/hooks/useSocialMediaPosts.tsx` | Reset de notificação quando `post_date` muda |

