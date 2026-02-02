
# Diagnóstico e Correção: Notificações Push não funcionam no Android

## Problema Identificado

A usuária **Suellen** (suhpratess08@gmail.com) não recebe notificações push no celular Android, mas recebe normalmente no desktop.

### Situação Atual dos Tokens:

| Dispositivo | Status | Última Atualização |
|-------------|--------|-------------------|
| Desktop (Windows) | ✅ Ativo | 02/02 13:50 |
| Android PWA | ❌ Inativo | 02/02 16:27 |

---

## Causa Raiz

O token Android foi **desativado automaticamente** pelo sistema quando o FCM retornou erro "UNREGISTERED" durante o envio de uma notificação.

**Problema no fluxo de reativação:**
Quando a usuária abre o app no celular novamente, o sistema tenta salvar o token via `upsert`. Porém, como o token já existe no banco com `is_active: false`, o upsert não está conseguindo reativá-lo corretamente porque o campo `is_active: true` não é aplicado na atualização.

---

## Solução

Modificar a função `saveToken` no hook `usePushNotifications` para garantir que tokens existentes sejam **sempre reativados** ao abrir o app.

### Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePushNotifications.tsx` | Adicionar lógica para forçar reativação de token existente |

---

## Implementação Técnica

### Modificar `saveToken` (linhas 179-256)

Adicionar uma etapa extra que **reativa explicitamente** o token se ele já existe mas está inativo:

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
    // Step 1: Verificar se o token já existe (ativo ou inativo)
    const { data: existingToken } = await supabase
      .from('push_subscriptions')
      .select('id, is_active')
      .eq('user_id', user.id)
      .eq('fcm_token', fcmToken)
      .maybeSingle();

    // Step 2: Se token existe mas está inativo, REATIVAR explicitamente
    if (existingToken && !existingToken.is_active) {
      console.log('[Push] Reativando token existente que estava inativo');
      const { error: reactivateError } = await supabase
        .from('push_subscriptions')
        .update({ 
          is_active: true,
          device_info: { ... },  // atualizar device_info
          updated_at: new Date().toISOString()
        })
        .eq('id', existingToken.id);
      
      if (!reactivateError) {
        console.log('[Push] Token reativado com sucesso');
        return; // Token já salvo e reativado
      }
    }

    // Step 3: Desativar tokens do mesmo tipo de dispositivo (código existente)
    // ...

    // Step 4: Upsert do token (código existente)
    // ...
  } catch (error) {
    console.error('[Push] Failed to save token:', error);
  }
}, [user, currentAgency]);
```

---

## Solução Imediata para a Usuária

Enquanto a correção de código é implementada, a usuária pode resolver o problema manualmente:

1. Abrir o app no celular Android
2. Ir em **Configurações > Notificações > Canais de Notificação**
3. Expandir **Push Notifications**
4. Clicar em **⚙️ Diagnóstico Firebase** 
5. Clicar no botão **"Reativar Push"**
6. Após a reativação, clicar em **"Ativar"** novamente

---

## Benefícios da Correção

1. **Tokens inativos são reativados automaticamente** quando o usuário abre o app
2. **Não depende de ação manual** do usuário
3. **Resolve o problema de tokens que expiraram** e foram desativados pelo FCM
4. **Mantém suporte a múltiplos dispositivos** simultâneos

---

## Resumo das Alterações

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/usePushNotifications.tsx` | Adicionar verificação e reativação explícita de tokens inativos antes do upsert |
