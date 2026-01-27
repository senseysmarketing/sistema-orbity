
# Correção Definitiva: Duplicação de Push Notifications

## Problema Identificado

O sistema está enviando **DUAS notificações push** para cada evento porque:

1. O payload FCM contém tanto `notification` (exibição automática pelo FCM) quanto `data` (processado pelo Service Worker)
2. O FCM SDK exibe automaticamente a notificação via `notification`
3. O Service Worker TAMBÉM exibe via `showNotification()` no evento `push`

Resultado: 2 pushes idênticas com ~2 segundos de diferença

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO ATUAL (DUPLICADO)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Edge Function envia para FCM:                                  │
│  {                                                              │
│    notification: { title, body },  ←──── FCM exibe AQUI         │
│    data: { ... }                   ←──── SW exibe AQUI          │
│  }                                                              │
│                                                                 │
│  FCM recebe e:                                                  │
│    1. Exibe automaticamente via "notification" (push #1)        │
│    2. Envia "push" event para Service Worker                    │
│       └─ SW exibe via showNotification() (push #2)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Solucao: Data-Only Payload

Enviar apenas `data` (sem `notification`) para que SOMENTE o Service Worker exiba a notificacao:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO CORRIGIDO (UNICO)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Edge Function envia para FCM:                                  │
│  {                                                              │
│    data: { title, body, ... }   ←──── APENAS dados              │
│  }                                                              │
│                                                                 │
│  FCM recebe e:                                                  │
│    1. NAO exibe nada (sem "notification")                       │
│    2. Envia "push" event para Service Worker                    │
│       └─ SW exibe via showNotification() (push unico)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mudancas Tecnicas

### 1. Edge Function: send-push-notification/index.ts

Remover o campo `notification` do payload FCM e mover tudo para `data`:

**Antes (duplica):**
```typescript
const message = {
  message: {
    token: fcmToken,
    notification: {              // ← FCM exibe automaticamente
      title: payload.title,
      body: payload.body,
    },
    webpush: {
      notification: {
        icon: '...',
        badge: '...',
      },
      fcm_options: { link: absoluteActionUrl },
    },
    data: {
      ...payload.data,
      click_action: absoluteActionUrl,
    },
  },
};
```

**Depois (unico):**
```typescript
const message = {
  message: {
    token: fcmToken,
    // SEM notification - deixa o Service Worker exibir
    webpush: {
      fcm_options: {
        link: absoluteActionUrl,
      },
    },
    data: {
      title: payload.title,         // ← Movido para data
      body: payload.body,           // ← Movido para data
      icon: payload.icon || 'https://sistema-orbity.lovable.app/favicon.ico',
      notification_id: payload.data?.notification_id || '',
      action_url: absoluteActionUrl,
      ...payload.data,
    },
  },
};
```

---

### 2. Service Worker: firebase-messaging-sw.js

Atualizar para extrair dados corretamente do payload `data`:

```javascript
self.addEventListener('push', (event) => {
  console.log('[SW] Push event recebido');

  if (!event.data) {
    console.log('[SW] Push event sem dados');
    return;
  }

  event.waitUntil((async () => {
    let msg = {};
    try {
      msg = event.data.json();
    } catch {
      msg = { data: { body: event.data.text() } };
    }

    console.log('[SW] Push payload:', JSON.stringify(msg));

    // Priorizar dados do campo 'data' (data-only payload)
    const data = msg?.data || {};
    const title = data?.title || msg?.notification?.title || 'Nova notificacao';
    const body = data?.body || msg?.notification?.body || '';
    const icon = data?.icon || 'https://sistema-orbity.lovable.app/favicon.ico';

    // Tag unica baseada no ID da notificacao
    const notificationTag = data?.notification_id || `orbity-${Date.now()}`;

    console.log('[SW] Exibindo notificacao:', title, 'tag:', notificationTag);

    await self.registration.showNotification(title, {
      body,
      icon,
      badge: 'https://sistema-orbity.lovable.app/favicon.ico',
      data,
      tag: notificationTag,
      renotify: false  // NAO renotificar se tag igual (previne duplicatas)
    });

    console.log('[SW] Notificacao exibida com sucesso');
  })());
});
```

---

### 3. Remover onBackgroundMessage redundante

O handler `onBackgroundMessage` do Firebase SDK nao e mais necessario com data-only payload:

```javascript
// REMOVER ou comentar este bloco:
// messaging.onBackgroundMessage((payload) => {
//   console.log('[SW] onBackgroundMessage recebido:', payload);
//   return;
// });
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/send-push-notification/index.ts` | Remover `notification`, mover dados para `data` |
| `public/firebase-messaging-sw.js` | Priorizar `data`, remover `onBackgroundMessage`, usar `renotify: false` |

---

## Por que Data-Only Payload?

| Aspecto | Com `notification` | Data-Only |
|---------|-------------------|-----------|
| Quem exibe? | FCM automatico + SW | Apenas SW |
| Controle | Limitado | Total |
| Duplicacao | Possivel | Impossivel |
| Tags dinamicas | Nao | Sim |
| Funciona em iOS/Safari | Sim | Sim |

---

## Resultado Esperado

- **Antes**: 2 push notifications por evento (1 do FCM + 1 do SW)
- **Depois**: 1 push notification por evento (apenas do SW)

A notificacao sera exibida com tag unica baseada no `notification_id`, impedindo qualquer duplicacao mesmo em cenarios de retry.
