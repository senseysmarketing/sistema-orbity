
# Remover Notificação Redundante: "Aguardando Aprovação"

## Contexto

Você quer remover a notificação específica **"Quando um post entrar em Aguardando Aprovação"** porque já existe a notificação genérica **"Quando o status mudar"** (`post.status_changed`) que cobre esse caso, tornando-a redundante.

---

## O que será removido

| Local | Item |
|-------|------|
| Preferências UI | Switch "Quando um post entrar em Aguardando Aprovação" |
| Banco de dados | Trigger que dispara evento `post.pending_approval` |
| Código | Chave `pendingApproval` no objeto `POST_EVENT_KEYS` |

---

## Mudanças Técnicas

### 1. NotificationPreferences.tsx

**Remover a chave do objeto POST_EVENT_KEYS:**
```tsx
// Antes (linha 196-201):
const POST_EVENT_KEYS = {
  assigned: 'post.assigned',
  statusChanged: 'post.status_changed',
  importantUpdated: 'post.updated_important',
  pendingApproval: 'post.pending_approval',  // ← REMOVER
} as const;

// Depois:
const POST_EVENT_KEYS = {
  assigned: 'post.assigned',
  statusChanged: 'post.status_changed',
  importantUpdated: 'post.updated_important',
} as const;
```

**Remover do estado inicial postEvents:**
```tsx
// Antes (linha 240-245):
const [postEvents, setPostEvents] = useState<Record<PostEventKey, boolean>>({
  [POST_EVENT_KEYS.assigned]: true,
  [POST_EVENT_KEYS.statusChanged]: true,
  [POST_EVENT_KEYS.importantUpdated]: true,
  [POST_EVENT_KEYS.pendingApproval]: true,  // ← REMOVER
});

// Depois:
const [postEvents, setPostEvents] = useState<Record<PostEventKey, boolean>>({
  [POST_EVENT_KEYS.assigned]: true,
  [POST_EVENT_KEYS.statusChanged]: true,
  [POST_EVENT_KEYS.importantUpdated]: true,
});
```

**Remover o switch da UI (linhas 701-713):**
```tsx
// REMOVER TODO ESTE BLOCO:
<div className="flex items-center justify-between">
  <Label className="cursor-pointer text-sm">
    <span className="hidden md:inline">Quando um post entrar em "Aguardando Aprovação"</span>
    <span className="md:hidden">Aguardando aprovação</span>
  </Label>
  <Switch
    checked={postEvents[POST_EVENT_KEYS.pendingApproval]}
    disabled={!types.posts_enabled}
    onCheckedChange={(checked) =>
      setPostEvents(prev => ({ ...prev, [POST_EVENT_KEYS.pendingApproval]: checked }))
    }
  />
</div>
```

---

### 2. Trigger do Banco de Dados

Remover a seção que dispara o evento `post.pending_approval` do trigger `notify_post_update_events()`:

```sql
-- REMOVER este bloco do trigger (linhas 205-xxx):
-- Pending approval event
IF NEW.status = 'pending_approval' AND OLD.status IS DISTINCT FROM 'pending_approval' THEN
  v_event_key := 'post.pending_approval';
  -- ... resto da lógica de notificação
END IF;
```

O evento de mudança de status genérico (`post.status_changed`) já notifica quando o post muda para qualquer status, incluindo "Aguardando Aprovação".

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/notifications/NotificationPreferences.tsx` | Remover `pendingApproval` de POST_EVENT_KEYS, estado e UI |
| Nova migration SQL | Atualizar trigger `notify_post_update_events()` removendo bloco de pending_approval |

---

## Resultado

Após a mudança:

- **Antes**: 4 eventos de post (assigned, statusChanged, importantUpdated, pendingApproval)
- **Depois**: 3 eventos de post (assigned, statusChanged, importantUpdated)

A notificação de "Aguardando Aprovação" será coberta automaticamente por "Quando o status mudar" sem redundância.
