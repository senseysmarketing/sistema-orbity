

# Correção: Push Multi-Dispositivo com Token Único por Device

## Problema Atual

A lógica atual desativa **todos** os tokens do usuário quando um novo é registrado, impedindo notificações em múltiplos dispositivos.

## Solução Proposta

Criar um **identificador único por tipo de dispositivo** e desativar apenas tokens antigos do **mesmo tipo de dispositivo**, mantendo tokens de outros dispositivos ativos.

---

## Estratégia de Identificação

Vamos criar um `deviceType` baseado em características únicas:

| Dispositivo | isIOS | isAndroid | standalone | deviceType |
|-------------|-------|-----------|------------|------------|
| iPhone PWA | true | false | true | `ios-pwa` |
| iPhone Safari | true | false | false | `ios-browser` |
| Android PWA | false | true | true | `android-pwa` |
| Android Chrome | false | true | false | `android-browser` |
| Mac/PC Chrome | false | false | false | `desktop-browser` |
| Mac/PC PWA | false | false | true | `desktop-pwa` |

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePushNotifications.tsx` | Criar deviceType, salvar no device_info, e desativar apenas tokens do mesmo deviceType |
| `supabase/functions/send-push-notification/index.ts` | Adicionar headers TTL e Urgency |

---

## Implementação Frontend

### 1. Função para gerar deviceType

```typescript
// Helper para gerar identificador único do tipo de dispositivo
const getDeviceType = (): string => {
  const ios = isIOS();
  const android = isAndroid();
  const standalone = isStandalone();
  
  if (ios) return standalone ? 'ios-pwa' : 'ios-browser';
  if (android) return standalone ? 'android-pwa' : 'android-browser';
  return standalone ? 'desktop-pwa' : 'desktop-browser';
};
```

### 2. Lógica de saveToken atualizada

```typescript
const saveToken = useCallback(async (fcmToken: string) => {
  if (!user || !currentAgency) {
    console.log('[Push] Cannot save token - no user or agency');
    return;
  }

  const standalone = isStandalone();
  const ios = isIOS();
  const android = isAndroid();
  const deviceType = getDeviceType();

  try {
    // Buscar tokens existentes do usuário
    const { data: existingTokens } = await supabase
      .from('push_subscriptions')
      .select('id, fcm_token, device_info')
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Desativar apenas tokens do MESMO tipo de dispositivo (exceto o atual)
    if (existingTokens && existingTokens.length > 0) {
      const tokensToDeactivate = existingTokens.filter(sub => {
        // Se é o mesmo token, não desativa
        if (sub.fcm_token === fcmToken) return false;
        
        // Verifica se é do mesmo tipo de dispositivo
        const existingDeviceType = sub.device_info?.deviceType;
        return existingDeviceType === deviceType;
      });

      if (tokensToDeactivate.length > 0) {
        const idsToDeactivate = tokensToDeactivate.map(t => t.id);
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .in('id', idsToDeactivate);
        
        console.log(`[Push] Deactivated ${tokensToDeactivate.length} old ${deviceType} tokens`);
      }
    }

    // Upsert o novo token com deviceType no device_info
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      agency_id: currentAgency.id,
      fcm_token: fcmToken,
      device_info: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        standalone: standalone,
        displayMode: standalone ? 'standalone' : 'browser',
        isIOS: ios,
        isAndroid: android,
        deviceType: deviceType,  // NOVO: identificador do tipo de dispositivo
        generatedAt: new Date().toISOString(),
      },
      platform: 'web',
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { 
      onConflict: 'user_id,fcm_token' 
    });

    if (error) throw error;
    
    console.log(`[Push] Token saved for ${deviceType} (standalone: ${standalone})`);
  } catch (error) {
    console.error('[Push] Failed to save token:', error);
  }
}, [user, currentAgency]);
```

---

## Implementação Backend

### Adicionar headers no send-push-notification

```typescript
webpush: {
  headers: {
    TTL: '86400',      // 24h de persistência
    Urgency: 'high',   // Entrega imediata para iOS/Android
  },
  fcm_options: {
    link: absoluteActionUrl,
  },
},
```

---

## Resultado Final

| Cenário | Comportamento |
|---------|---------------|
| Usuário ativa no iPhone PWA | Token `ios-pwa` ativo |
| Mesmo usuário ativa no Mac Chrome | Token `desktop-browser` ativo, iPhone continua ativo |
| Usuário reinstala PWA no iPhone | Token antigo `ios-pwa` desativado, novo `ios-pwa` ativo |
| Push enviado | Vai para iPhone E Mac simultaneamente |

---

## Benefícios

1. **Multi-dispositivo real**: Mac + iPhone + Android recebem notificações
2. **Sem duplicação**: Apenas 1 token por tipo de dispositivo
3. **Auto-limpeza**: Reinstalar o PWA limpa token antigo do mesmo device
4. **Logs claros**: Console mostra qual deviceType foi registrado

