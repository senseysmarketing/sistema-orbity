
# Correção: Loop de Re-renderização nas Preferências de Notificação (Android)

## Problema Identificado

O usuário "João Paulo" no Android não consegue usar as Preferências de Notificação porque a tela fica "atualizando toda hora". A investigação revelou um **loop de re-renderização** causado por dependências instáveis no hook `usePushNotifications`.

## Causa Raiz

O hook `usePushNotifications` possui um `useEffect` para carregar o token existente que inclui `saveToken` nas suas dependências:

```typescript
useEffect(() => {
  const loadExistingToken = async () => {
    // ... obtém token ...
    await saveToken(existingToken);  // Re-save para manter atualizado
  };
  loadExistingToken();
}, [user, isSupported, permission, hasFirebaseConfig, getFirebaseMessaging, saveToken]); 
//                                                                           ↑
//                                                           DEPENDÊNCIA INSTÁVEL
```

### Por que causa loop:

1. Componente monta → `useEffect` executa
2. `saveToken` é chamado → faz query no banco
3. Enquanto isso, `currentAgency` é carregada pelo `useAgency`
4. `currentAgency` muda → `saveToken` é recriado (novo `useCallback`)
5. Nova referência de `saveToken` → `useEffect` dispara de novo
6. Volta ao passo 2 → **LOOP!**

No Android, isso é mais perceptível porque:
- Service Worker pode demorar mais para ativar
- Firebase pode enviar eventos de atualização de token mais frequentemente
- O estado `permission` pode oscilar durante a inicialização

---

## Solução

### Mudanças no `usePushNotifications.tsx`

1. **Usar `useRef` para armazenar função estável** - evitar que `saveToken` seja dependência direta
2. **Adicionar flag para evitar execuções duplicadas** - controle de "já carregou"
3. **Remover `saveToken` das dependências do useEffect** - usar ref em vez disso

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePushNotifications.tsx` | Estabilizar `saveToken` com ref e evitar loop |

---

## Implementação Detalhada

### Adicionar ref para saveToken estável

```typescript
// Adicionar junto com os outros refs (após linha 63)
const saveTokenRef = useRef<(token: string) => Promise<void>>();

// Após a definição do saveToken (após linha 244)
saveTokenRef.current = saveToken;
```

### Modificar o useEffect para usar ref

```typescript
// Substituir o useEffect de loadExistingToken (linhas 382-408)
useEffect(() => {
  // Flag para evitar execuções duplicadas durante a mesma sessão
  let didLoad = false;
  
  const loadExistingToken = async () => {
    if (didLoad) return;
    if (!user || !isSupported || permission !== 'granted' || !hasFirebaseConfig) return;

    didLoad = true;
    
    try {
      const messaging = getFirebaseMessaging();
      const registration = await navigator.serviceWorker.ready;
      
      const existingToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (existingToken) {
        console.log('[Push] Existing token found');
        setToken(existingToken);
        
        // Usar ref para evitar dependência instável
        if (saveTokenRef.current) {
          await saveTokenRef.current(existingToken);
        }
      }
    } catch (error) {
      console.error('[Push] Error loading existing token:', error);
    }
  };

  loadExistingToken();
  
  return () => {
    didLoad = true; // Cancelar se desmontar
  };
}, [user?.id, isSupported, permission, hasFirebaseConfig, getFirebaseMessaging]); 
// Nota: Removido saveToken, usando user?.id em vez de user
```

---

## Mudanças Principais

1. **`saveTokenRef`**: Armazena referência estável da função
2. **`didLoad` flag**: Evita execuções duplicadas dentro do mesmo efeito
3. **Dependência `user?.id`**: Usa ID primitivo em vez do objeto inteiro
4. **Removido `saveToken` das deps**: Usa ref para chamar a função

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Loop contínuo de re-render | Carrega token uma única vez |
| Tela piscando toda hora | Tela estável |
| Não consegue abrir Preferências | Preferências funcionam normalmente |

---

## Por que isso afeta mais o Android?

1. **Timing diferente**: Android Chrome pode inicializar Service Workers mais lentamente
2. **Permission flicker**: Estado de permissão pode oscilar brevemente
3. **FCM behavior**: Firebase no Android pode emitir mais eventos de atualização
4. **Memory/CPU**: Devices Android variados podem processar efeitos em tempos diferentes

A correção estabiliza o comportamento em **todas** as plataformas (iOS, Android, Desktop).
