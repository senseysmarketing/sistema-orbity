
# Correção do Service Worker para iOS/Safari

## Problema Identificado

O **backend está funcionando perfeitamente** - os logs mostram:
- ✅ `[FCM] Push notifications sent: 4/4`
- ✅ `[FCM] Message sent successfully`

O problema está no **Service Worker** que não processa corretamente as notificações no Safari/iOS.

---

## Problemas no Service Worker Atual

| Problema | Impacto no iOS |
|----------|----------------|
| Inicialização duplicada do Firebase | Pode causar erros silenciosos no Safari |
| Sem fallback `push` event listener | Safari pode não chamar `onBackgroundMessage` |
| Propriedades `vibrate` e `requireInteraction` | Safari ignora ou pode falhar silenciosamente |
| Ícones com caminho relativo `/favicon.ico` | Safari precisa de URLs absolutas |

---

## Solução

### 1. Corrigir Service Worker (`firebase-messaging-sw.js`)

Aplicar as correções sugeridas pelo ChatGPT:

- **Inicialização única**: Remover inicialização duplicada
- **Fallback push listener**: Adicionar `self.addEventListener('push', ...)` para Safari
- **Remover propriedades problemáticas**: `vibrate`, `requireInteraction`
- **URLs absolutas para ícones**: Usar `https://sistema-orbity.lovable.app/favicon.ico`

### 2. Corrigir Edge Function (`send-push-notification`)

Remover propriedades não suportadas do payload FCM:
- Remover `vibrate` do payload webpush
- Remover `requireInteraction` do payload webpush

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `public/firebase-messaging-sw.js` | Reescrever com versão robusta para Safari |
| `supabase/functions/send-push-notification/index.ts` | Remover propriedades problemáticas do payload |

---

## Novo Service Worker

```javascript
// firebase-messaging-sw.js (versão robusta para iOS)

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

// Inicialização única e segura
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (e) {
  console.error('[SW] Firebase init error:', e);
}

const messaging = firebase.messaging();

// 1) Firebase background handler
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] onBackgroundMessage:', payload);
  // Mostrar notificação via fallback push handler
});

// 2) Fallback universal - essencial para Safari/iOS
self.addEventListener('push', (event) => {
  console.log('[SW] Push event recebido');

  if (!event.data) return;

  event.waitUntil((async () => {
    let msg = {};
    try {
      msg = event.data.json();
    } catch {
      msg = { data: { body: event.data.text() } };
    }

    const title = msg?.notification?.title || msg?.data?.title || 'Nova notificação';
    const body = msg?.notification?.body || msg?.data?.body || '';
    const data = msg?.data || {};

    await self.registration.showNotification(title, {
      body,
      icon: 'https://sistema-orbity.lovable.app/favicon.ico',
      badge: 'https://sistema-orbity.lovable.app/favicon.ico',
      data,
      tag: 'orbity-notification'
    });
  })());
});

// 3) Click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Navegar para URL de ação
});
```

---

## Resultado Esperado

Após as correções:

1. ✅ Push notifications funcionarão no iPhone/Safari
2. ✅ Inicialização única e estável
3. ✅ Fallback garante que a notificação sempre aparece
4. ✅ Sem propriedades problemáticas para iOS

---

## Teste Após Implementação

1. **Desinstalar e reinstalar PWA** (necessário para atualizar o Service Worker)
2. Criar uma tarefa atribuída a você
3. A notificação deve aparecer no iPhone
