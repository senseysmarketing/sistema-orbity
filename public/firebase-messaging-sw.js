// Firebase Cloud Messaging Service Worker (Data-Only Payload v3)
// SW assume 100% do controle de exibição. Sem dependência do FCM auto-display.
// Funciona em iOS PWA, Android Chrome e Desktop.

self.addEventListener('install', () => {
  console.log('[SW] Installing v3 (data-only)...');
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v3...');
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handler universal de push - data-only
self.addEventListener('push', (event) => {
  console.log('[SW] Push event recebido');

  if (!event.data) {
    console.log('[SW] Push event sem dados');
    return;
  }

  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data.json();
    } catch {
      payload = { data: { body: event.data.text() } };
    }

    const data = payload?.data || {};
    const title = data.title || 'Nova notificação';
    const body = data.body || '';
    const icon = data.icon || 'https://sistema-orbity.lovable.app/favicon.ico';
    const tag = data.notification_id || data.tag || `orbity-${Date.now()}`;
    const url = data.action_url || data.url || '/dashboard';

    const options = {
      body,
      icon,
      badge: 'https://sistema-orbity.lovable.app/favicon.ico',
      tag,
      renotify: false,
      vibrate: [200, 100, 200],
      data: { ...data, url },
      actions: [{ action: 'open', title: 'Ver agora' }],
    };

    console.log('[SW] Exibindo notificação:', title, 'tag:', tag);
    await self.registration.showNotification(title, options);
  })());
});

// Click handler universal
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || event.notification.data?.action_url || '/dashboard';
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        try { await client.navigate(absoluteUrl); } catch {}
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(absoluteUrl);
  })());
});
