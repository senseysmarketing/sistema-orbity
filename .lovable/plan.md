
# Correção: Loop de Re-renderização nas Preferências de Notificação (iPhone)

## Problema Identificado

O loop de re-renderização nas Preferências de Notificação persiste em iPhones mesmo após a correção anterior. A investigação identificou múltiplas causas:

### Causa 1: Valores calculados inline no retorno do hook

No `usePushNotifications.tsx`, as funções `isIOS()` e `isAndroid()` são executadas diretamente no return statement:

```typescript
return {
  // ...
  isIOS: isIOS(),      // ← Executada a cada render
  isAndroid: isAndroid(), // ← Executada a cada render
};
```

Embora retornem valores primitivos (boolean), isso força recálculo desnecessário.

### Causa 2: Dependência instável no useEffect de foreground messages

```typescript
useEffect(() => {
  // ...listener de mensagens foreground...
}, [isSupported, permission, hasFirebaseConfig, getFirebaseMessaging, toast]);
//                                                                    ↑
//                                                     Pode mudar frequentemente
```

O objeto `toast` do hook `useToast` pode ter referência instável, causando re-execuções do efeito.

### Causa 3: PushDiagnostics executando efeito no mount

O `PushDiagnostics` executa `refreshDiagnostics()` sem as dependências corretas:

```typescript
useEffect(() => {
  refreshDiagnostics();
}, []); // ← Deveria incluir refreshDiagnostics ou usar ref
```

---

## Solução

### Arquivo 1: `src/hooks/usePushNotifications.tsx`

1. **Memoizar valores de plataforma usando `useMemo`**
2. **Remover `toast` das dependências usando ref**
3. **Estabilizar todos os valores retornados**

```typescript
// Memoizar detecção de plataforma (só calcula uma vez)
const platformInfo = useMemo(() => ({
  isIOS: isIOS(),
  isAndroid: isAndroid(),
  isStandalone: isStandalone(),
}), []); // Vazio porque user agent não muda durante sessão

// Ref para toast (evitar dependência instável)
const toastRef = useRef(toast);
toastRef.current = toast;

// Atualizar useEffect de foreground para usar ref
useEffect(() => {
  if (!isSupported || permission !== 'granted' || !hasFirebaseConfig) return;

  try {
    const messaging = getFirebaseMessaging();
    
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[Push] Foreground message received:', payload);
      
      // Usar ref ao invés de toast diretamente
      toastRef.current({
        title: payload.notification?.title || 'Nova notificação',
        description: payload.notification?.body,
      });
      // ...
    });

    return () => unsubscribe();
  } catch (error) {
    console.error('[Push] Error setting up foreground listener:', error);
  }
}, [isSupported, permission, hasFirebaseConfig, getFirebaseMessaging]); // ← Removido toast

// Retorno estável
return {
  permission,
  token,
  isSupported,
  isLoading,
  hasFirebaseConfig,
  isStandaloneMode,
  isIOS: platformInfo.isIOS,       // ← Valor memoizado
  isAndroid: platformInfo.isAndroid, // ← Valor memoizado
  requestPermission,
  disablePushNotifications,
};
```

### Arquivo 2: `src/components/notifications/PushDiagnostics.tsx`

1. **Corrigir dependências do useEffect inicial**

```typescript
// Usar useRef para evitar re-execução desnecessária
const initializedRef = useRef(false);

useEffect(() => {
  if (initializedRef.current) return;
  initializedRef.current = true;
  
  refreshDiagnostics();
}, [refreshDiagnostics]);
```

---

## Mudanças Detalhadas

| Arquivo | Mudança | Motivo |
|---------|---------|--------|
| `usePushNotifications.tsx` | Adicionar `useMemo` para platformInfo | Evitar recálculo de isIOS/isAndroid |
| `usePushNotifications.tsx` | Adicionar `toastRef` | Remover toast das dependências |
| `usePushNotifications.tsx` | Atualizar useEffect de foreground | Usar ref ao invés de toast |
| `usePushNotifications.tsx` | Atualizar return statement | Usar valores memoizados |
| `PushDiagnostics.tsx` | Adicionar `initializedRef` | Evitar múltiplas execuções |

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Tela piscando constantemente no iPhone | Tela estável |
| Re-renders infinitos | Render único no mount |
| useEffects executando múltiplas vezes | useEffects executando apenas quando necessário |

---

## Por que afeta mais o iPhone?

1. **Safari/WebKit**: Tem comportamento diferente com Service Workers
2. **iOS PWA**: Pode disparar eventos de visibilidade mais frequentemente
3. **Memory pressure**: iOS pode forçar re-renders em situações de baixa memória
4. **Firebase SDK**: Pode ter comportamentos específicos no iOS

A correção estabiliza o hook em **todas** as plataformas, mas terá maior impacto no iPhone onde o problema é mais visível.
