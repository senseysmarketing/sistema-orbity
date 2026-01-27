

# Refatoração Definitiva: Sistema de Push Notifications

## Diagnóstico Completo das Duplicações

### Fontes de Duplicação Identificadas

| # | Fonte | Local | O que faz | Resultado |
|---|-------|-------|-----------|-----------|
| **1** | Trigger do Banco | `trg_push_on_new_notification` | INSERT em `notifications` → chama `send-push-notification` | 1x push |
| **2** | Realtime + Browser API | `useNotifications.tsx` linhas 203-211 | Escuta INSERT via realtime → chama `showNotification()` (Browser Notification API) | 1x notificação browser |
| **3** | Service Worker | `firebase-messaging-sw.js` | Recebe push do FCM → chama `showNotification()` | 1x push |

### Fluxo Atual (Problemático)

```text
Tarefa atribuída
       ↓
Trigger notify_task_assignment
       ↓
INSERT INTO notifications
       ↓
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│ trg_push_on_new_notification    │    │ Supabase Realtime               │
│      ↓                          │    │      ↓                          │
│ send-push-notification          │    │ useNotifications.tsx            │
│      ↓                          │    │      ↓                          │
│ FCM envia push                  │    │ showNotification() [Browser]    │
│      ↓                          │    │      ↓                          │
│ Service Worker → showNotification│    │ NOTIFICAÇÃO DUPLICADA #2       │
│      ↓                          │    └─────────────────────────────────┘
│ NOTIFICAÇÃO #1                  │
└─────────────────────────────────┘
```

**Resultado**: 2 notificações aparecem para cada evento!

---

## Solução: Simplificar para Fluxo Único de Push

### Estratégia

**Priorizar Push Notifications (FCM)** e **remover a notificação via Browser API** no hook `useNotifications`.

O fluxo será:

```text
INSERT INTO notifications
       ↓
Trigger trg_push_on_new_notification
       ↓
send-push-notification (Edge Function)
       ↓
FCM envia para dispositivo
       ↓
Service Worker recebe push
       ↓
showNotification() [único]
       ↓
1 notificação apenas ✓
```

### Mudanças Necessárias

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useNotifications.tsx` | **Remover** a chamada `showNotification()` no handler de realtime (linhas 203-211) |
| `public/firebase-messaging-sw.js` | Nenhuma mudança necessária - já está correto |

---

## Detalhes Técnicos

### `src/hooks/useNotifications.tsx`

**Antes (Problemático):**
```typescript
// Subscribe to realtime updates
const channel = supabase
  .channel('notifications-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `agency_id=eq.${currentAgency?.id}`,
    },
    (payload) => {
      console.log('Notification change:', payload);
      
      // ❌ ISSO CAUSA DUPLICAÇÃO - push já foi enviado pelo trigger
      if (payload.eventType === 'INSERT') {
        const newNotification = payload.new as Notification;
        
        showNotification(newNotification.title, {
          body: newNotification.message,
          tag: newNotification.id,
          icon: '/favicon.ico',
        });
      }
      
      fetchNotifications();
    }
  )
  .subscribe();
```

**Depois (Correto):**
```typescript
// Subscribe to realtime updates
const channel = supabase
  .channel('notifications-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `agency_id=eq.${currentAgency?.id}`,
    },
    (payload) => {
      console.log('Notification change:', payload);
      // Push notification já foi enviada pelo trigger do banco via FCM
      // Aqui apenas atualizamos a lista de notificações na UI
      fetchNotifications();
    }
  )
  .subscribe();
```

---

## Por que esta é a solução correta?

| Aspecto | Browser Notification API | FCM Push (Service Worker) |
|---------|--------------------------|---------------------------|
| Funciona em background | ❌ Apenas com app aberto | ✅ Sim |
| Funciona no iOS PWA | ❌ Limitado | ✅ Sim (com PWA instalado) |
| Persistência | ❌ Nenhuma | ✅ Entregue mesmo offline |
| Ícone/Badge consistente | ❌ Varia | ✅ Configurável |

**FCM é superior** para todos os casos de uso, então o realtime deve apenas atualizar a UI (lista de notificações), não disparar notificações duplicadas.

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/hooks/useNotifications.tsx` | Remover `showNotification()` do handler de INSERT (linhas 203-211) |

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| 2 notificações por evento | 1 notificação por evento |
| Realtime + FCM duplicando | Apenas FCM (via trigger) |
| Confusão de fontes | Fluxo único e previsível |

---

## Fluxo Final Simplificado

```text
Ação do usuário (ex: atribuir tarefa)
            ↓
Trigger no banco (notify_task_assignment)
            ↓
INSERT INTO notifications
            ↓
Trigger trg_push_on_new_notification
            ↓
Edge Function send-push-notification
            ↓
FCM envia para dispositivo(s)
            ↓
Service Worker recebe push event
            ↓
showNotification() → 1 notificação ✓
            ↓
Realtime atualiza lista na UI (sem notificação)
```

