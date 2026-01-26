
# Plano: Implementação de Push Notifications com Firebase Cloud Messaging (FCM)

## Visão Geral

Implementar notificações push via Firebase Cloud Messaging para o PWA Orbity, permitindo que usuários com o app instalado (especialmente em iPhones) recebam notificações mesmo quando o app está em segundo plano.

---

## Passo a Passo: Configuração do Firebase Console

### 1. Criar Projeto no Firebase
1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Criar projeto"** ou **"Add project"**
3. Nome do projeto: `orbity-push` (ou similar)
4. Desative o Google Analytics (opcional)
5. Clique em **"Criar projeto"**

### 2. Adicionar App Web ao Projeto
1. Na página inicial do projeto, clique no ícone **Web** (`</>`)
2. Nome do app: `Orbity PWA`
3. **NÃO** marque "Firebase Hosting"
4. Clique em **"Registrar app"**
5. **Copie os dados de configuração** que aparecem:
```javascript
// Você vai me informar esses valores:
const firebaseConfig = {
  apiKey: "AIza...",           // FIREBASE_API_KEY
  authDomain: "xxx.firebaseapp.com",
  projectId: "xxx",            // FIREBASE_PROJECT_ID
  storageBucket: "xxx.appspot.com",
  messagingSenderId: "123...", // FIREBASE_SENDER_ID
  appId: "1:123:web:abc..."    // FIREBASE_APP_ID
};
```

### 3. Obter VAPID Key (Web Push Certificate)
1. Vá em **Configurações do projeto** (engrenagem) → **Cloud Messaging**
2. Role até **"Configuração da Web"** (Web configuration)
3. Clique em **"Gerar par de chaves"** (Generate key pair)
4. **Copie a chave pública (VAPID Key)**: `BNx7...` (começa com B, ~87 caracteres)
   - Esta é a `FIREBASE_VAPID_KEY`

### 4. Obter Service Account (para Backend)
1. Vá em **Configurações do projeto** → **Contas de serviço** (Service accounts)
2. Clique em **"Gerar nova chave privada"** (Generate new private key)
3. Salve o arquivo JSON (ex: `orbity-push-firebase-adminsdk-xxx.json`)
4. **Abra o arquivo e copie TODO o conteúdo JSON** - esta é a `FIREBASE_SERVICE_ACCOUNT`

### 5. Resumo das Credenciais Necessárias

| Segredo | Onde encontrar | Exemplo |
|---------|---------------|---------|
| `FIREBASE_API_KEY` | Config do app web | `AIzaSyABC123...` |
| `FIREBASE_PROJECT_ID` | Config do app web | `orbity-push-12345` |
| `FIREBASE_SENDER_ID` | Config do app web | `123456789012` |
| `FIREBASE_APP_ID` | Config do app web | `1:123:web:abc123` |
| `FIREBASE_VAPID_KEY` | Cloud Messaging → Web config | `BNx7gH...` (~87 chars) |
| `FIREBASE_SERVICE_ACCOUNT` | Service accounts → JSON | `{"type":"service_account",...}` |

---

## Implementação Técnica

### 1. Criar Tabela `push_subscriptions`

Tabela para armazenar tokens FCM dos dispositivos:

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  device_info JSONB DEFAULT '{}',
  platform TEXT DEFAULT 'web',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, fcm_token)
);

-- Índices para performance
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_agency ON push_subscriptions(agency_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

### 2. Criar Service Worker: `public/firebase-messaging-sw.js`

```javascript
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "FIREBASE_API_KEY",
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, data } = payload.notification || payload.data;
  
  self.registration.showNotification(title, {
    body,
    icon: icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: data,
    vibrate: [200, 100, 200],
    requireInteraction: true
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.action_url || '/dashboard';
  event.waitUntil(clients.openWindow(url));
});
```

### 3. Criar Hook: `src/hooks/usePushNotifications.tsx`

Hook para gerenciar tokens FCM e permissões:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAgency } from '@/hooks/useAgency';
import { useToast } from '@/hooks/use-toast';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [token, setToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const { user } = useAuth();
  const { currentAgency } = useAgency();
  const { toast } = useToast();

  // Verificar suporte e registrar service worker
  useEffect(() => {
    const checkSupport = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setIsSupported(true);
        setPermission(Notification.permission);
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      }
    };
    checkSupport();
  }, []);

  // Solicitar permissão e obter token
  const requestPermission = useCallback(async () => {
    if (!isSupported) return null;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);
      
      const fcmToken = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });

      if (fcmToken && user) {
        await saveToken(fcmToken);
        setToken(fcmToken);
        toast({ title: "Notificações push ativadas!" });
      }
      return fcmToken;
    }
    return null;
  }, [isSupported, user]);

  // Salvar token no Supabase
  const saveToken = async (fcmToken: string) => {
    if (!user || !currentAgency) return;

    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      agency_id: currentAgency.id,
      fcm_token: fcmToken,
      device_info: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      },
      is_active: true,
    }, { onConflict: 'user_id,fcm_token' });
  };

  // Escutar mensagens em primeiro plano
  useEffect(() => {
    if (!isSupported || permission !== 'granted') return;

    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const unsubscribe = onMessage(messaging, (payload) => {
      toast({
        title: payload.notification?.title,
        description: payload.notification?.body,
      });
    });

    return () => unsubscribe();
  }, [isSupported, permission]);

  return {
    permission,
    token,
    isSupported,
    requestPermission,
  };
}
```

### 4. Criar Edge Function: `supabase/functions/send-push-notification/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
}

async function getAccessToken(): Promise<string> {
  const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
  
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));

  // Assinar JWT com a chave privada
  const key = await crypto.subtle.importKey(
    'pkcs8',
    new TextEncoder().encode(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claim}`)
  );

  const jwt = `${header}.${claim}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

  // Trocar JWT por access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const { access_token } = await tokenResponse.json();
  return access_token;
}

async function sendToFCM(token: string, payload: PushPayload, accessToken: string) {
  const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
  
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          webpush: {
            notification: {
              icon: payload.icon || '/favicon.ico',
              badge: '/favicon.ico',
              vibrate: [200, 100, 200],
              requireInteraction: true,
            },
            fcm_options: {
              link: payload.data?.action_url || '/dashboard',
            },
          },
          data: payload.data,
        },
      }),
    }
  );

  return response.ok;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: PushPayload = await req.json();
    
    // Buscar tokens ativos do usuário
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', payload.user_id)
      .eq('is_active', true);

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getAccessToken();
    let sent = 0;

    for (const sub of subscriptions) {
      const success = await sendToFCM(sub.fcm_token, payload, accessToken);
      if (success) sent++;
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error sending push:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### 5. Integrar com `process-notifications`

Adicionar chamada para enviar push após criar notificações:

```typescript
// Adicionar no início da função batchCreateNotifications
async function batchCreateNotifications(notifications: NotificationData[]) {
  if (notifications.length === 0) return;

  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) {
    console.error('Error batch creating notifications:', error);
    return;
  }

  // Enviar push notifications
  for (const notif of notifications) {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          user_id: notif.user_id,
          title: notif.title,
          body: notif.message,
          data: {
            type: notif.type,
            action_url: notif.action_url,
            ...notif.metadata,
          },
        }),
      });
    } catch (e) {
      console.error('Error sending push notification:', e);
    }
  }
}
```

### 6. Adicionar Variáveis de Ambiente (`.env`)

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=orbity-push.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=orbity-push
VITE_FIREBASE_STORAGE_BUCKET=orbity-push.appspot.com
VITE_FIREBASE_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123:web:abc123
VITE_FIREBASE_VAPID_KEY=BNx7...
```

### 7. UI para Ativar Notificações

Adicionar botão nas configurações:

```tsx
// Em NotificationPreferences.tsx
const { permission, requestPermission, isSupported } = usePushNotifications();

{isSupported && (
  <div className="flex items-center justify-between">
    <div>
      <Label>Notificações Push (Celular)</Label>
      <p className="text-sm text-muted-foreground">
        Receba alertas mesmo com o app fechado
      </p>
    </div>
    <Button 
      onClick={requestPermission}
      disabled={permission === 'granted'}
    >
      {permission === 'granted' ? 'Ativado ✓' : 'Ativar'}
    </Button>
  </div>
)}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| **Nova migração SQL** | Criar tabela `push_subscriptions` |
| `public/firebase-messaging-sw.js` | **Criar** - Service Worker FCM |
| `src/hooks/usePushNotifications.tsx` | **Criar** - Hook para gerenciar FCM |
| `supabase/functions/send-push-notification/index.ts` | **Criar** - Edge function para enviar push |
| `supabase/functions/process-notifications/index.ts` | **Modificar** - Integrar envio de push |
| `src/components/notifications/NotificationPreferences.tsx` | **Modificar** - Adicionar botão de ativar push |
| `.env` | **Adicionar** variáveis Firebase (públicas) |
| **Secrets Supabase** | `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID` |

---

## Secrets a Configurar

Após você me informar os dados do Firebase:

| Secret | Tipo | Onde usar |
|--------|------|-----------|
| `FIREBASE_SERVICE_ACCOUNT` | Supabase Secret | Edge function |
| `FIREBASE_PROJECT_ID` | Supabase Secret | Edge function |
| `VITE_FIREBASE_*` | `.env` (públicas) | Frontend |

---

## Fluxo de Funcionamento

```
1. Usuário abre app → Hook registra service worker
2. Usuário clica "Ativar Push" → Solicita permissão
3. Permissão concedida → FCM gera token
4. Token salvo em push_subscriptions
5. Cron/trigger cria notificação → process-notifications
6. process-notifications chama send-push-notification
7. Edge function envia para FCM
8. FCM entrega no dispositivo (mesmo com app fechado)
```

---

## Próximos Passos

1. **Você configura o Firebase** seguindo o passo a passo acima
2. **Me informa as credenciais** (API Key, Project ID, VAPID Key, Service Account JSON)
3. **Eu implemento** todo o código e configuro os secrets
