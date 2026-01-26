

# Correção Definitiva: Push Notifications no iPhone

## Problemas Identificados

### 1. Múltiplos Tokens Obsoletos
Você tem **5 tokens ativos** para o mesmo usuário, incluindo 4 do iPhone. Cada reinstalação da PWA gera novo token, mas os antigos não são limpos. O FCM envia para todos, mas apenas o token **mais recente** funciona no dispositivo atual.

| Token (início) | Plataforma | Status | Problema |
|----------------|------------|--------|----------|
| `dzubEJ6e8...` | iPhone 18.7 | ✅ Ativo (mais recente) | Este é o correto |
| `ec5I6ovvQ...` | iPhone 18.7 | ⚠️ Ativo (obsoleto) | Deve ser desativado |
| `cuVsf32RF...` | iPhone 18.7 | ⚠️ Ativo (obsoleto) | Deve ser desativado |
| `e0YBtIy4X...` | iPhone 18.7 | ⚠️ Ativo (obsoleto) | Deve ser desativado |
| `fljQCFwBr...` | Mac Chrome | ✅ Ativo | Correto para Mac |

### 2. URL Relativa no FCM Options
O campo `fcm_options.link` está usando `/dashboard` (relativo) quando deveria usar URL absoluta `https://sistema-orbity.lovable.app/dashboard`. No Safari/iOS isso pode impedir a notificação de funcionar.

### 3. Falta de Limpeza de Tokens Antigos
Quando o usuário ativa push notifications novamente após reinstalar, devemos **desativar tokens anteriores do mesmo dispositivo**.

---

## Solução

### Etapa 1: Limpar Tokens Obsoletos (SQL)

Executar uma limpeza manual dos tokens antigos para seu usuário, mantendo apenas o mais recente por dispositivo:

```sql
-- Desativar tokens antigos de iPhone, mantendo apenas o mais recente
UPDATE push_subscriptions 
SET is_active = false 
WHERE user_id = '03755812-224d-42d4-b651-bdbc09c323ad'
  AND device_info->>'platform' = 'iPhone'
  AND id != '211258a4-6812-491c-85d5-c42ecfeed948'; -- O token mais recente
```

### Etapa 2: Corrigir Edge Function (`send-push-notification`)

Atualizar o payload FCM para usar **URL absoluta** no `fcm_options.link`:

```typescript
webpush: {
  fcm_options: {
    link: payload.data?.action_url?.startsWith('http') 
      ? payload.data.action_url 
      : `https://sistema-orbity.lovable.app${payload.data?.action_url || '/dashboard'}`,
  },
},
```

### Etapa 3: Melhorar Hook `usePushNotifications`

Adicionar lógica para **desativar tokens anteriores do mesmo dispositivo** antes de salvar um novo:

```typescript
const saveToken = useCallback(async (fcmToken: string) => {
  if (!user || !currentAgency) return;

  try {
    // 1. Desativar tokens anteriores deste dispositivo
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .neq('fcm_token', fcmToken);

    // 2. Upsert o novo token
    await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      agency_id: currentAgency.id,
      fcm_token: fcmToken,
      // ... resto do código
    });
  } catch (error) { /* ... */ }
}, [user, currentAgency]);
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Nova migration SQL | Limpar tokens obsoletos |
| `supabase/functions/send-push-notification/index.ts` | Usar URL absoluta no `fcm_options.link` |
| `src/hooks/usePushNotifications.tsx` | Desativar tokens antigos ao ativar novos |

---

## Resultado Esperado

1. ✅ Apenas o token mais recente do iPhone ficará ativo
2. ✅ O FCM enviará apenas para o dispositivo correto
3. ✅ URL absoluta garantirá compatibilidade com Safari/iOS
4. ✅ Próximas reinstalações limpam tokens automaticamente

---

## Teste Após Implementação

1. Executar a migration para limpar tokens
2. Deploy das alterações
3. **Desinstalar e reinstalar a PWA** no iPhone
4. Ativar push notifications
5. Verificar que só há **1 token ativo** para iPhone
6. Criar uma tarefa atribuída a você
7. A notificação deve aparecer no iPhone

