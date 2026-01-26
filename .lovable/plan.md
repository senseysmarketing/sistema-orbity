

# Correção: Notificações Push Não Chegando no iOS

## Diagnóstico

### Backend: Funcionando ✅
```
[FCM] Push notifications sent: 1/1
[FCM] Message sent successfully: projects/orbityapp-f710e/messages/bd0a5e64-...
```

### O Problema: Service Worker

Há dois problemas no `firebase-messaging-sw.js`:

| Problema | Descrição |
|----------|-----------|
| **1. Tag fixa** | `tag: 'orbity-notification'` faz com que notificações substituam as anteriores silenciosamente |
| **2. Firebase SDK conflito** | Ao remover `onBackgroundMessage`, o SDK pode estar "interceptando" o evento push antes do handler universal |

---

## Solução

### Arquivo: `public/firebase-messaging-sw.js`

**Mudança 1**: Remover a tag fixa ou usar tag dinâmica baseada no ID da notificação

```javascript
// ANTES
await self.registration.showNotification(title, {
  body,
  icon: '...',
  badge: '...',
  data,
  tag: 'orbity-notification'  // ❌ Tag fixa substitui notificações
});

// DEPOIS
await self.registration.showNotification(title, {
  body,
  icon: '...',
  badge: '...',
  data,
  tag: data?.notification_id || `orbity-${Date.now()}`,  // ✅ Tag única por notificação
  renotify: true  // Força som/vibração mesmo se tag existir
});
```

**Mudança 2**: Restaurar `onBackgroundMessage` mas SEM exibir notificação (apenas log), para evitar que o Firebase SDK "engula" o evento

```javascript
// Manter o Firebase SDK satisfeito mas sem duplicação
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] onBackgroundMessage (handled by push event):', payload);
  // NÃO mostrar notificação aqui - o push event universal cuida disso
  return;
});
```

---

## Código Final do Service Worker

```javascript
// Firebase Cloud Messaging Service Worker (versão robusta para iOS/Safari)

// Forçar ativação imediata do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(clients.claim());
});

// Handler para mensagens do client
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'FIREBASE_CONFIG') {
    console.log('[SW] Firebase config received');
  }
});

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBIDL3R7nd0pE0wzmXdNePWTSyxOvyZ0cY",
  authDomain: "orbityapp-f710e.firebaseapp.com",
  projectId: "orbityapp-f710e",
  storageBucket: "orbityapp-f710e.appspot.com",
  messagingSenderId: "929526059094",
  appId: "1:929526059094:web:61fb87a4f693ddd61b2bf7"
};

try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (e) {
  console.error('[SW] Firebase init error:', e);
}

const messaging = firebase.messaging();

// Manter Firebase SDK satisfeito - não exibe notificação, apenas log
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] onBackgroundMessage recebido (handled by push event)');
  // Retorna sem fazer nada - o push event universal cuida da exibição
});

// Handler universal de push - funciona em todos os browsers incluindo Safari/iOS
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

    const title = msg?.notification?.title || msg?.data?.title || 'Nova notificação';
    const body = msg?.notification?.body || msg?.data?.body || '';
    const data = msg?.data || {};

    // Tag única baseada no ID da notificação ou timestamp
    const notificationTag = data?.notification_id || `orbity-${Date.now()}`;

    console.log('[SW] Exibindo notificação:', title, 'tag:', notificationTag);

    await self.registration.showNotification(title, {
      body,
      icon: 'https://sistema-orbity.lovable.app/favicon.ico',
      badge: 'https://sistema-orbity.lovable.app/favicon.ico',
      data,
      tag: notificationTag,
      renotify: true  // Força som/vibração mesmo com tag existente
    });

    console.log('[SW] Notificação exibida com sucesso');
  })());
});

// Click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);
  
  event.notification.close();

  const actionUrl = event.notification.data?.action_url || '/dashboard';
  const urlToOpen = new URL(actionUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      return clients.openWindow?.(urlToOpen);
    })
  );
});
```

---

## Resumo das Mudanças

| Item | Antes | Depois |
|------|-------|--------|
| `tag` | Fixo `'orbity-notification'` | Dinâmico baseado em `notification_id` |
| `renotify` | Não existia | `true` - força som mesmo com tag |
| `onBackgroundMessage` | Removido | Restaurado (apenas log, sem exibição) |
| Logs | Básicos | Detalhados para debug |

---

## Passos Após Deploy

1. **Forçar atualização do SW no iPhone**:
   - Vá em Configurações → Notificações
   - Clique em "Atualizar Service Worker"
   - Aguarde o status mudar para "active"

2. **Testar Push**:
   - Clique em "Testar Push"
   - A notificação deve aparecer

3. **Se ainda não funcionar**:
   - Reinstale a PWA (remover da tela inicial → adicionar novamente)
   - Ative as notificações novamente

