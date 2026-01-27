// Firebase Cloud Messaging Service Worker (Data-Only Payload - sem duplicação)

// Forçar ativação imediata do Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(clients.claim());
});

// Handler para mensagens do client (forçar skipWaiting)
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// NOTA: Firebase SDK não é mais necessário para data-only payloads
// O evento 'push' universal abaixo cuida de tudo

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

    // Data-only payload: todos os dados vêm do campo 'data'
    const data = msg?.data || {};
    const title = data?.title || 'Nova notificação';
    const body = data?.body || '';
    const icon = data?.icon || 'https://sistema-orbity.lovable.app/favicon.ico';

    // Tag única baseada no ID da notificação (evita duplicação)
    const notificationTag = data?.notification_id || `orbity-${Date.now()}`;

    console.log('[SW] Exibindo notificação:', title, 'tag:', notificationTag);

    await self.registration.showNotification(title, {
      body,
      icon,
      badge: 'https://sistema-orbity.lovable.app/favicon.ico',
      data,
      tag: notificationTag,
      renotify: false  // NÃO renotificar se tag igual (previne duplicatas)
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
