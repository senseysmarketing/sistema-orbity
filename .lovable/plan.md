

# Correção de Notificações Push Duplicadas

## Diagnóstico

### Causas Identificadas

A análise revelou **múltiplas fontes de duplicação**:

| Fonte | Problema | Efeito |
|-------|----------|--------|
| **1. Trigger do Banco** | `trg_push_on_new_notification` dispara push quando notificação é inserida na tabela `notifications` | 1x push por INSERT |
| **2. Edge Function `process-notifications`** | Após inserir notificações, chama `send-push-notification` em loop para cada uma | 1x push adicional por INSERT |
| **3. Service Worker** | Tem **dois handlers** para push: `messaging.onBackgroundMessage()` E `self.addEventListener('push')` | Pode mostrar 2x a mesma notificação |

### Fluxo Atual (Problemático)

```text
Tarefa criada/atualizada
       ↓
┌─────────────────────────────────────────────────┐
│ Trigger notify_task_assignment                  │
│    → INSERT INTO notifications                  │
│         ↓                                       │
│    Trigger trg_push_on_new_notification         │
│         → send-push-notification (1ª vez)       │
└─────────────────────────────────────────────────┘
                   +
┌─────────────────────────────────────────────────┐
│ Cron → process-notifications                    │
│    → Detecta notificação pendente              │
│    → INSERT INTO notifications                  │
│         → Trigger (2ª vez)                      │
│    → Loop fetch send-push-notification (3ª vez) │
└─────────────────────────────────────────────────┘
                   +
┌─────────────────────────────────────────────────┐
│ Service Worker                                  │
│    → messaging.onBackgroundMessage() (1x)       │
│    → self.addEventListener('push') (1x)         │
│    = 2 notificações exibidas por push          │
└─────────────────────────────────────────────────┘
```

**Resultado**: Uma única ação pode gerar 4-6 notificações exibidas!

---

## Solução

### Mudanças Necessárias

| Arquivo | Ação |
|---------|------|
| `supabase/functions/process-notifications/index.ts` | **Remover** o loop que chama `send-push-notification` (linhas 110-145) |
| `public/firebase-messaging-sw.js` | **Remover** o `messaging.onBackgroundMessage()` e manter apenas o `push` event listener |

### Por que essas correções?

1. **O trigger do banco já envia o push automaticamente** - não há necessidade de chamadas manuais na Edge Function
2. **O `push` event listener é o handler universal** - funciona em todos os browsers incluindo Safari. O `onBackgroundMessage` do Firebase é redundante e causa duplicação

---

## Detalhes Técnicos

### 1. `supabase/functions/process-notifications/index.ts`

**Remover linhas 110-145** (o loop de push manual):

```typescript
// ANTES (problemático)
async function batchCreateNotifications(notifications: NotificationData[]) {
  if (notifications.length === 0) return;

  const { error } = await supabase
    .from('notifications')
    .insert(notifications);

  if (error) {
    console.error('Error batch creating notifications:', error);
    return;
  }

  // ❌ REMOVER TUDO ABAIXO - o trigger do banco já faz isso
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  for (const notif of notifications) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        // ...
      });
    } catch (e) {
      // ...
    }
  }
}
```

```typescript
// DEPOIS (correto)
async function batchCreateNotifications(notifications: NotificationData[]) {
  if (notifications.length === 0) return;

  const { error } = await supabase
    .from('notifications')
    .insert(notifications);

  if (error) {
    console.error('Error batch creating notifications:', error);
    return;
  }

  // Push notification é disparado automaticamente pelo trigger do banco
  console.log(`[Notifications] ${notifications.length} notificações criadas (push será enviado via trigger)`);
}
```

### 2. `public/firebase-messaging-sw.js`

**Remover o handler duplicado** `messaging.onBackgroundMessage()`:

```javascript
// ANTES (problemático)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] onBackgroundMessage:', payload);
  // Duplicação! O push event já trata isso
});

self.addEventListener('push', (event) => {
  // Handler universal
});
```

```javascript
// DEPOIS (correto)
// Removido onBackgroundMessage - usando apenas o push event universal

self.addEventListener('push', (event) => {
  console.log('[SW] Push event recebido');
  // Handler universal - funciona em todos os browsers
});
```

---

## Fluxo Corrigido

```text
Tarefa criada/atualizada
       ↓
Trigger notify_task_assignment
       ↓
INSERT INTO notifications
       ↓
Trigger trg_push_on_new_notification
       ↓
send-push-notification (apenas 1x)
       ↓
FCM envia para dispositivo
       ↓
Service Worker: push event (apenas 1 handler)
       ↓
1 notificação exibida ✓
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/process-notifications/index.ts` | Remover loop de push nas linhas 110-145 |
| `public/firebase-messaging-sw.js` | Remover `messaging.onBackgroundMessage()` (linhas 48-52) |

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| 4 notificações por evento | 1 notificação por evento |
| Push manual + trigger automático | Apenas trigger automático |
| 2 handlers no SW | 1 handler no SW |
| Conflito de fontes | Fluxo único e previsível |

