

# Correção: Notificações Push em Segundo Plano no iOS/Mobile

## Diagnóstico Confirmado

O push está sendo **enviado com sucesso pelo FCM** (logs mostram `sent: 2/2`), mas o usuário não vê a notificação no celular. Isso acontece porque:

### Causa Raiz: Service Worker sem controle ativo

No arquivo `public/firebase-messaging-sw.js`, os handlers de ativação foram removidos:

```javascript
self.addEventListener('activate', () => {
  console.log('[SW] Activating...');
  // NÃO usar clients.claim() aqui - evita assumir controle e forçar reload
});
```

**O problema**: Sem `clients.claim()`, o Service Worker fica ativo mas **não assume controle do escopo**. No iOS, isso significa que:
- O FCM entrega a mensagem ao SW
- O SW está ativo mas não tem controle
- O evento `push` **não é processado** porque o SW não está "em controle"

Adicionalmente, no `vite.config.ts`:
```javascript
skipWaiting: false,
clientsClaim: false,
```

Isso afeta o PWA SW mas não o Firebase SW (que é separado).

---

## Solução

### Arquivo 1: `public/firebase-messaging-sw.js`

Restaurar `clients.claim()` apenas no evento `activate`, o que permite ao SW assumir controle do escopo e receber eventos push imediatamente.

**Antes:**
```javascript
self.addEventListener('activate', () => {
  console.log('[SW] Activating...');
  // NÃO usar clients.claim() aqui
});
```

**Depois:**
```javascript
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  // Assumir controle para receber push events - ESSENCIAL para iOS
  event.waitUntil(clients.claim());
});
```

**Por que isso é seguro para o Firebase SW:**
- Este SW é **separado** do PWA SW
- Ele só processa push notifications
- `clients.claim()` aqui não causa reload da página (diferente do PWA SW)
- É **necessário** para que o iOS entregue os push events corretamente

---

## Por que não adicionar `skipWaiting()` também?

O `skipWaiting()` já está sendo enviado via `postMessage` quando o usuário registra push (no `usePushNotifications.tsx` linha 119-120). Isso é mais seguro do que fazer `skipWaiting()` automático no install.

Mas se necessário, podemos também adicionar `skipWaiting()` condicional baseado na versão do iOS/Safari para garantir ativação mais rápida.

---

## Mudanças Detalhadas

| Arquivo | Mudança |
|---------|---------|
| `public/firebase-messaging-sw.js` | Adicionar `clients.claim()` no evento `activate` |

---

## Código Final

```javascript
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  // Assumir controle imediato para receber push events - ESSENCIAL para iOS PWA
  event.waitUntil(clients.claim());
});
```

---

## Por que isso resolve o problema?

1. **FCM envia push** → OK (já funcionando)
2. **SW recebe evento push** → Antes: FALHA (sem controle). Depois: OK
3. **SW exibe notificação** → Antes: Nunca chega. Depois: Funciona

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Push enviado mas não exibido | Push enviado e exibido |
| SW ativo sem controle | SW ativo com controle |
| iOS não recebe em background | iOS recebe normalmente |

