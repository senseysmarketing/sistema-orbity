
# Diagnóstico Final e Correção Completa para Push Notifications no iPhone

## 🔍 Diagnóstico

### O que está funcionando
| Componente | Status | Evidência |
|------------|--------|-----------|
| Backend (Edge Function) | ✅ OK | `[FCM] Message sent successfully: projects/orbityapp-f710e/messages/85086501-...` |
| Firebase Secrets | ✅ OK | Access token gerado com sucesso |
| Token FCM | ✅ OK | O FCM aceitou a mensagem (status 200) |

### O Problema Real

**O token está sendo gerado no Safari padrão, não na PWA instalada.**

Evidência no banco de dados:
```
userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 
           (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1"
```

Este userAgent é de **Safari padrão**. Se fosse a PWA standalone, seria diferente (sem "Safari/604.1").

### Por que isso importa?

- No iOS, push notifications só funcionam quando o token é gerado **dentro da PWA instalada** (aberta pelo ícone na tela inicial)
- Tokens gerados no Safari padrão são descartados pelo iOS quando o Safari fecha
- O Firebase aceita o token, mas o iOS não entrega a notificação

---

## 🛠️ Correções Necessárias

### 1. Detectar e Validar Contexto PWA

Adicionar verificação no `usePushNotifications.tsx` para:
- Verificar se está em modo `standalone` (PWA)
- Salvar informação de `displayMode` no `device_info`
- Mostrar aviso se o usuário tentar ativar push fora da PWA

### 2. Melhorar Registro do Service Worker

Especificar `scope: '/'` explicitamente no registro do Service Worker para garantir que está no escopo correto.

### 3. Adicionar Debug Visual

Criar componente de debug temporário para você verificar:
- Se está em modo standalone
- Qual Service Worker está ativo
- Qual token foi gerado

---

## 📁 Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePushNotifications.tsx` | Adicionar validação de standalone, melhorar device_info, scope explícito |
| `src/components/notifications/NotificationPreferences.tsx` | Mostrar aviso se não estiver em PWA standalone |

---

## Código das Correções

### 1. `src/hooks/usePushNotifications.tsx`

```typescript
// Função auxiliar para detectar modo standalone
const isStandalone = (): boolean => {
  // iOS standalone
  if ((navigator as any).standalone === true) return true;
  // Android/Desktop PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari com display-mode
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  return false;
};

// No saveToken, incluir info do displayMode
const saveToken = useCallback(async (fcmToken: string) => {
  // ...
  const { error } = await supabase.from('push_subscriptions').upsert({
    // ...
    device_info: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      standalone: isStandalone(),  // NOVO
      displayMode: isStandalone() ? 'standalone' : 'browser',  // NOVO
    },
    // ...
  });
});

// No registro do SW, adicionar scope explícito
const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
  scope: '/',  // NOVO - escopo explícito
});

// Na função requestPermission, validar contexto
const requestPermission = useCallback(async () => {
  // Verificar se está em modo standalone (PWA instalada)
  if (!isStandalone()) {
    toast({
      title: "Abra pela PWA instalada",
      description: "Para receber notificações, abra o app pelo ícone na tela inicial, não pelo Safari.",
      variant: "destructive",
    });
    return null;
  }
  // ... resto do código
});
```

### 2. Limpar tokens antigos do Safari (não-standalone)

Executar uma query para desativar tokens gerados fora da PWA:

```sql
-- Não há como distinguir agora, mas após a atualização do código,
-- novos tokens terão device_info.standalone = true/false
```

---

## 🔄 Fluxo Após Implementação

1. **Você desinstala a PWA** do iPhone
2. **Reinstala** pelo Safari (Compartilhar → Adicionar à Tela de Início)
3. **Abre pelo ícone** na tela inicial (NÃO pelo Safari)
4. Vai em Configurações → Notificações → Ativa Push
5. O sistema detecta `standalone: true` e gera token válido
6. Notificações funcionam!

---

## ⚠️ Passo Crítico para o Usuário

**Você precisa garantir que está abrindo o app pelo ÍCONE na tela inicial, não pelo Safari.**

- ✅ **Correto**: Tocar no ícone "Orbity" na tela inicial do iPhone
- ❌ **Incorreto**: Abrir Safari e digitar a URL

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Token gerado em Safari padrão | Token gerado apenas em PWA standalone |
| `standalone: undefined` no device_info | `standalone: true` no device_info |
| iOS não entrega push | iOS entrega push corretamente |
| Sem validação de contexto | Aviso se tentar ativar fora da PWA |
