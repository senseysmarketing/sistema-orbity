
# Plano: Data-Only Push Payloads + Hardening + Build Cleanup

## 1. `public/firebase-messaging-sw.js` (reescrita)

- Remover qualquer dependência do Firebase SDK no SW (já era data-only, mas reforçar).
- Listener `push` universal: lê `payload.data` e chama `self.registration.showNotification(title, options)` com `vibrate`, `actions: [{action:'open', title:'Ver agora'}]`, `tag` único (notification_id), `renotify: false`.
- `notificationclick`: tenta `client.navigate()` em aba existente do mesmo origin; senão `clients.openWindow(targetUrl)`. Lê URL de `data.url || data.action_url`.
- Mantém `clients.claim()` no activate e `SKIP_WAITING` controlado.

## 2. `supabase/functions/send-push-notification/index.ts`

Substituir o objeto `message` em `sendToFCM` por payload **data-only blindado**:

```ts
const message = {
  message: {
    token: fcmToken,
    data: {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || 'https://sistema-orbity.lovable.app/favicon.ico',
      url: absoluteActionUrl,
      action_url: absoluteActionUrl,
      tag: payload.data?.notification_id || `orbity-${Date.now()}`,
      notification_id: payload.data?.notification_id || `${Date.now()}`,
      ...payload.data,
    },
    android: { priority: 'HIGH' },
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
      },
      payload: {
        aps: { 'content-available': 1, 'mutable-content': 1 },
      },
    },
    webpush: {
      headers: { TTL: '86400', Urgency: 'high' },
      fcm_options: { link: absoluteActionUrl },
    },
  },
};
```

(Sem chave `notification` — SW exibe.)

## 3. `src/hooks/usePushNotifications.tsx` — Refresh inteligente do token

Adicionar guardrail anti-spam:

- Constantes: `const TOKEN_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;`
- Em `saveToken`, antes do upsert, ler do `localStorage` `last_saved_token` e `last_saved_token_at`. Se `fcmToken === last_saved_token` **E** `Date.now() - last_saved_token_at < 12h`, fazer `return` cedo (log "[Push] Token cache hit, skipping save").
- Após upsert bem-sucedido, gravar `localStorage.setItem('last_saved_token', fcmToken)` e `localStorage.setItem('last_saved_token_at', String(Date.now()))`.
- Adicionar listener `visibilitychange` num novo `useEffect` (deps: `user?.id`, `isSupported`, `permission`, `hasFirebaseConfig`) que, quando `document.visibilityState === 'visible'`, chama `getToken()` e `saveTokenRef.current(token)` — o cache acima evita spam.
- Cleanup do listener no return.

## 4. Build errors (limpeza de tipagem `unknown`)

Padrão: substituir `error.message` (e variantes `e`, `qrErr`, `apiErr`, `recordError`, `_match`) por `(error as Error).message` ou typed params. Arquivos:

- `supabase/functions/whatsapp-connect/index.ts` (9 ocorrências: linhas 57, 58, 139, 227, 266, 277, 304, 401, 416)
- `supabase/functions/whatsapp-send/index.ts` (linha 143)
- `supabase/functions/whatsapp-sync-messages/index.ts` (linha 239)
- `supabase/functions/whatsapp-webhook/index.ts`:
  - Linha 606: `promoteLeadOnReply(supabase, account.agency_id, conversation.lead_id!)` — confirmar não-nulo no escopo do `if (conversation.lead_id)` que já existe acima OU fazer guard explícito.
  - Linha 656: `(error as Error).message`.

## 5. Resultado esperado

- iOS PWA: `content-available: 1` + `apns-priority: 10` acordam o SW em background → `push` listener exibe notificação localmente.
- Android: `priority: HIGH` força execução do SW mesmo em modo economia.
- DB: tokens só re-salvos quando mudam ou após 12h.
- Build limpo nos arquivos WhatsApp.

**Aprovar para executar.**
