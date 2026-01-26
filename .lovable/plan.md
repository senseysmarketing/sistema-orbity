

# Correção Definitiva para Push Notifications no iOS

## Diagnóstico Final

### O que está funcionando
| Item | Status | Evidência |
|------|--------|-----------|
| Backend FCM | ✅ OK | `Message sent successfully: projects/orbityapp-f710e/messages/da2d0550-...` |
| Token ativo | ✅ OK | `dbipKmw8VHAXWe6UebTSnO:APA91bEvfP2Yi768C9COfVmXg7sPi-...` |
| Modo standalone | ✅ OK | `device_info.standalone: true, isIOS: true` |
| Token inválido tratado | ✅ OK | `UNREGISTERED` foi outro usuário cujo token já foi desativado |

### O Problema Real: Conflito de Service Workers

A PWA está usando `vite-plugin-pwa` que gera um Service Worker Workbox para cache offline, mas há também o `firebase-messaging-sw.js` separado. Quando o diagnóstico mostra "SW aguardando ativação", significa que:

1. O Workbox SW está ativo (gerado pelo VitePWA)
2. O Firebase SW está "waiting" (não consegue assumir controle)
3. **O push chega ao Workbox SW, que não sabe processar FCM**

### Por que o erro UNREGISTERED aparecia como "total: 2"

- No momento do teste, haviam 2 tokens ativos no banco
- Um era válido (seu iPhone), outro era inválido (outro dispositivo/usuário)
- O token inválido foi automaticamente desativado após o erro 404
- Agora só resta 1 token ativo (o seu)

---

## Solução em 2 Partes

### Parte 1: Forçar Ativação Imediata do SW

Quando um Service Worker está em estado "waiting", ele precisa ser ativado manualmente:

```typescript
// No PushDiagnostics.tsx - modificar updateServiceWorker
const updateServiceWorker = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  
  for (const registration of registrations) {
    // Se há um SW esperando, forçar skipWaiting
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    await registration.update();
  }
};
```

```javascript
// No firebase-messaging-sw.js - adicionar handler para SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

### Parte 2: Garantir que Firebase SW é Registrado Corretamente

O problema pode estar no VitePWA gerando um SW que sobrescreve o Firebase SW. Precisamos garantir que:

1. O `firebase-messaging-sw.js` é registrado com escopo explícito
2. O SW recebe corretamente os push events

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `public/firebase-messaging-sw.js` | Adicionar handler `SKIP_WAITING` e `install/activate` events |
| `src/components/notifications/PushDiagnostics.tsx` | Corrigir lógica de verificação de SW e forçar ativação |
| `src/hooks/usePushNotifications.tsx` | Garantir registro correto do SW e forçar ativação |

---

## Detalhes Técnicos

### 1. firebase-messaging-sw.js

Adicionar no início do arquivo:

```javascript
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
```

### 2. PushDiagnostics.tsx

Corrigir `checkSwStatus` para detectar corretamente o estado:

```typescript
const checkSwStatus = useCallback(async () => {
  if (!('serviceWorker' in navigator)) {
    setSwStatus('none');
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    // Procurar especificamente pelo Firebase SW
    const fcmReg = registrations.find(r => 
      r.active?.scriptURL?.includes('firebase-messaging-sw.js')
    );
    
    if (!fcmReg) {
      // Procurar qualquer SW com escopo raiz
      const anyReg = registrations.find(r => r.scope.endsWith('/'));
      if (anyReg) {
        if (anyReg.installing) {
          setSwStatus('installing');
          addLog('Service Worker instalando...', 'warning');
        } else if (anyReg.waiting) {
          setSwStatus('waiting');
          addLog('SW aguardando - clique "Atualizar SW" para ativar', 'warning');
        } else if (anyReg.active) {
          setSwStatus('active');
          addLog(`SW ativo: ${anyReg.active.scriptURL}`, 'success');
        }
      } else {
        setSwStatus('none');
        addLog('Nenhum Service Worker encontrado', 'error');
      }
      return;
    }
    
    setSwStatus('active');
    addLog('Firebase SW ativo ✓', 'success');
  } catch (error) {
    setSwStatus('none');
    addLog(`Erro ao verificar SW: ${error}`, 'error');
  }
}, [addLog]);
```

Melhorar `updateServiceWorker` para forçar ativação:

```typescript
const updateServiceWorker = async () => {
  setIsUpdatingSW(true);
  addLog('Forçando ativação do Service Worker...', 'info');

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      // Se há um SW esperando, forçar skipWaiting
      if (registration.waiting) {
        addLog('SW em espera encontrado - enviando SKIP_WAITING', 'warning');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      await registration.update();
      addLog(`SW atualizado: ${registration.scope}`, 'success');
    }

    // Aguardar um pouco e verificar novamente
    await new Promise(resolve => setTimeout(resolve, 1000));
    await checkSwStatus();
    
    toast({ title: "Service Worker atualizado!" });
  } catch (error: any) {
    addLog(`Erro: ${error.message}`, 'error');
  } finally {
    setIsUpdatingSW(false);
  }
};
```

### 3. usePushNotifications.tsx

No registro do SW, garantir ativação imediata:

```typescript
// Register service worker with explicit scope
const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
  scope: '/',
});
console.log('[Push] Service worker registered:', registration.scope);

// Forçar ativação se estiver esperando
if (registration.waiting) {
  console.log('[Push] SW waiting, sending SKIP_WAITING');
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

// Aguardar até que o SW esteja ativo
if (registration.installing) {
  console.log('[Push] SW installing, waiting for activation...');
  await new Promise<void>((resolve) => {
    registration.installing!.addEventListener('statechange', (e) => {
      if ((e.target as ServiceWorker).state === 'activated') {
        resolve();
      }
    });
  });
}
```

---

## Fluxo de Teste Após Implementação

1. Após o deploy, **Forçar atualização no iPhone**:
   - Abra a PWA pelo ícone
   - Vá em Configurações → Notificações
   - Clique em **"Atualizar Service Worker"**
   - Verifique se o status muda de "waiting" para "active"

2. **Testar Push**:
   - Clique em "Testar Push"
   - Aguarde alguns segundos
   - A notificação deve aparecer

3. **Se ainda não funcionar**:
   - Reinstale a PWA (remover da tela inicial → adicionar novamente)
   - Ative as notificações
   - Teste novamente

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| SW status: "waiting" | SW status: "active" |
| Push não aparece no iOS | Push aparece corretamente |
| Conflito entre Workbox e Firebase SW | Firebase SW assume controle |

