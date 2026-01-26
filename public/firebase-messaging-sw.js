// Firebase Cloud Messaging Service Worker (versão robusta para iOS/Safari)

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

// 1) Firebase background handler (quando funcionar)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] onBackgroundMessage:', payload);
  // A notificação será mostrada pelo fallback push handler abaixo
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

    console.log('[SW] Push payload:', msg);

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
