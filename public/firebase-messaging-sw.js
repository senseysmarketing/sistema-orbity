// Firebase Cloud Messaging Service Worker
// Note: Firebase config values will be injected at runtime via postMessage
// or you can hardcode them here if preferred

let firebaseConfig = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    firebaseConfig = event.data.config;
    initializeFirebase();
  }
});

function initializeFirebase() {
  if (!firebaseConfig) return;
  
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Nova notificação';
    const notificationBody = payload.notification?.body || payload.data?.body || '';
    const notificationData = payload.data || {};

    const notificationOptions = {
      body: notificationBody,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: notificationData,
      vibrate: [200, 100, 200],
      requireInteraction: true,
      tag: notificationData.notification_id || 'orbity-notification',
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);
  
  event.notification.close();
  
  const actionUrl = event.notification.data?.action_url || '/dashboard';
  const urlToOpen = new URL(actionUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already an open window
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Initial load - try with env vars if available
try {
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');
  
  const defaultConfig = {
    apiKey: "AIzaSyBIDL3R7nd0pE0wzmXdNePWTSyxOvyZ0cY",
    authDomain: "orbityapp-f710e.firebaseapp.com",
    projectId: "orbityapp-f710e",
    storageBucket: "orbityapp-f710e.appspot.com",
    messagingSenderId: "929526059094",
    appId: "1:929526059094:web:61fb87a4f693ddd61b2bf7"
  };
  
  // Only initialize if config has real values (not placeholders)
  if (!defaultConfig.apiKey.includes('PLACEHOLDER')) {
    firebase.initializeApp(defaultConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Background message received:', payload);
      
      const notificationTitle = payload.notification?.title || payload.data?.title || 'Nova notificação';
      const notificationBody = payload.notification?.body || payload.data?.body || '';
      const notificationData = payload.data || {};

      self.registration.showNotification(notificationTitle, {
        body: notificationBody,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        data: notificationData,
        vibrate: [200, 100, 200],
        requireInteraction: true,
      });
    });
  }
} catch (e) {
  console.log('[SW] Waiting for Firebase config via postMessage');
}
