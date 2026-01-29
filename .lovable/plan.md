
# Plano: Melhorias no Sistema de Push Notifications para Android

## Diagnóstico Atual

### O Que Está Funcionando
- Edge function `send-push-notification` está operacional (testado com sucesso)
- Tokens FCM estão sendo salvos corretamente no banco
- Service Worker está processando notificações corretamente

### Problemas Identificados

1. **Usuários sem tokens ativos** - A maioria dos usuários não ativou push:
   - `giferreira2302@gmail.com` - 39 notificações, 0 tokens
   - `claracan310@gmail.com` - 22 notificações, 0 tokens
   - `leospedro1@hotmail.com` - 18 notificações, 0 tokens

2. **Falta detecção de dispositivo Android** - O hook `usePushNotifications` não captura `isAndroid` no `device_info`

3. **Falta incentivo para ativar push** - Não há banner/prompt automático pedindo para o usuário ativar notificações

---

## Solução Proposta

### Parte 1: Adicionar Detecção de Android no Hook de Push

Adicionar função `isAndroid()` e incluir no `device_info` salvo no banco:

```typescript
// src/hooks/usePushNotifications.tsx

// Helper to detect Android
const isAndroid = (): boolean => {
  return /android/i.test(navigator.userAgent);
};

// No saveToken, adicionar:
device_info: {
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  language: navigator.language,
  standalone: standalone,
  displayMode: standalone ? 'standalone' : 'browser',
  isIOS: ios,
  isAndroid: isAndroid(),  // NOVO
  generatedAt: new Date().toISOString(),
},
```

### Parte 2: Retornar `isAndroid` do Hook

Expor a detecção de Android para uso em outros componentes:

```typescript
return {
  permission,
  token,
  isSupported,
  isLoading,
  hasFirebaseConfig,
  isStandaloneMode,
  isIOS: isIOS(),
  isAndroid: isAndroid(),  // NOVO
  requestPermission,
  disablePushNotifications,
};
```

### Parte 3: Adicionar Instruções Específicas para Android

No `NotificationPreferences.tsx`, adicionar orientações para Android:

```typescript
{/* Android instructions */}
{isAndroid && !isStandaloneMode && !isEnabled && (
  <div className="ml-6 p-2 rounded-md bg-blue-500/10 border border-blue-500/30">
    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
      💡 Dica para Android:
    </p>
    <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
      Para melhor experiência, instale o app clicando no menu ⋮ e "Instalar aplicativo" ou "Adicionar à tela inicial".
    </p>
  </div>
)}
```

### Parte 4: Criar Banner de Incentivo para Ativar Push

Criar componente que aparece automaticamente para usuários que não ativaram push:

```typescript
// src/components/notifications/PushActivationBanner.tsx
// Banner que aparece após login para incentivar ativação de push
```

### Parte 5: Atualizar Diagnóstico com Info de Android

Adicionar status de Android no painel de diagnóstico:

```typescript
<div className="flex justify-between items-center p-2 bg-muted/50 rounded">
  <span className="text-muted-foreground">Dispositivo Android</span>
  <div className="flex items-center gap-1">
    <span>{isAndroid ? 'Sim' : 'Não'}</span>
  </div>
</div>
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePushNotifications.tsx` | Adicionar detecção `isAndroid()` e incluir no retorno e `device_info` |
| `src/components/notifications/NotificationPreferences.tsx` | Adicionar instruções específicas para Android |
| `src/components/notifications/PushDiagnostics.tsx` | Mostrar status de Android no painel |
| `src/components/notifications/PushActivationBanner.tsx` | NOVO - Banner para incentivar ativação |

---

## Benefícios Esperados

1. **Melhor diagnóstico** - Saber exatamente se o usuário está em Android
2. **Orientação específica** - Instruções claras para cada plataforma
3. **Maior adoção** - Banner incentiva usuários a ativarem push
4. **Debugging facilitado** - `device_info` completo no banco para análise

---

## Observações Importantes

- Os 2 usuários que não estão recebendo notificações **provavelmente não ativaram push**
- O sistema já está funcionando para quem tem token ativo (confirmado com teste)
- Android Chrome suporta push tanto no browser quanto em PWA (diferente do iOS que só funciona em PWA)
