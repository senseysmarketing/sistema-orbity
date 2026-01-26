
# Painel de Diagnóstico Completo para Push Notifications

## Diagnóstico Atual

### O que encontrei nos logs

| Situação | Status | Evidência |
|----------|--------|-----------|
| Token ativo no banco | ✅ Sim | `cRug8Z9ql80NKV8xGElkEb:APA91bGOXr...` |
| Modo standalone | ✅ Sim | `device_info.standalone: true` |
| iOS detectado | ✅ Sim | `device_info.isIOS: true` |
| FCM aceitou envio | ❌ Parcial | 1 token retornou `UNREGISTERED` (404) |
| Token entregue ao dispositivo | ❓ Desconhecido | O FCM aceitou, mas iOS pode não entregar |

### Problema identificado

Há **2 tokens sendo enviados**, mas o log mostra:
- Token 1: `UNREGISTERED` (404) - **Token inválido foi desativado automaticamente** ✅
- Token 2: `Message sent successfully` - **FCM aceitou** ✅

**O FCM diz que enviou com sucesso, mas o iOS não entrega.**

### Possíveis causas restantes

1. **Service Worker não está recebendo o push event** - o SW precisa estar ativo e registrado corretamente
2. **Permissões do iOS** - mesmo com `granted`, pode haver bloqueio nas configurações do iOS
3. **Token gerado com VAPID/projeto incorreto** - mismatch entre client e servidor

---

## Solução: Painel de Diagnóstico Visual

Criar um painel de diagnóstico completo similar ao da imagem de referência, com:

### 1. Status do Dispositivo (em tempo real)
- Dispositivo iOS: Sim/Não
- Modo PWA (Tela Início): Sim/Não
- User ID (Supabase)
- FCM Token (truncado + cópia completa)
- Service Worker: status (active/waiting/installing)
- Permissão: granted/denied/default
- Inscrito: Sim/Não
- Última atualização

### 2. Token FCM Completo (para testes)
- Exibir token completo em caixa de código
- Botão "Copiar Token"

### 3. Ações de Diagnóstico
- **Botão "Testar Push"**: Envia notificação de teste para o próprio dispositivo
- **Botão "Limpar tokens antigos"**: Remove tokens inativos
- **Botão "Atualizar Service Worker"**: Força atualização do SW

### 4. Logs em Tempo Real
- Exibir logs do processo de push em tempo real
- Mostrar respostas do FCM

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/notifications/PushDiagnostics.tsx` | **Criar** - Novo componente de diagnóstico |
| `src/hooks/usePushNotifications.tsx` | **Modificar** - Adicionar função `sendTestPush` |
| `src/components/notifications/NotificationPreferences.tsx` | **Modificar** - Integrar painel de diagnóstico |

---

## Detalhes Técnicos da Implementação

### 1. PushDiagnostics.tsx

```typescript
// Estrutura do componente
interface DiagnosticInfo {
  isIOS: boolean;
  isStandalone: boolean;
  userId: string | null;
  fcmToken: string | null;
  swStatus: 'active' | 'installing' | 'waiting' | 'none';
  permission: NotificationPermission;
  isSubscribed: boolean;
  lastUpdate: string;
}

// Features:
- Card com header "Diagnóstico Firebase" + botão "Atualizar"
- Grid de informações com labels e valores copiáveis
- Caixa de código com token completo
- Seção de ações (Limpar tokens, Atualizar SW)
- Log de eventos em tempo real (array de mensagens)
```

### 2. Função sendTestPush

```typescript
// No hook usePushNotifications
const sendTestPush = useCallback(async () => {
  if (!user || !token) return { success: false, error: 'No token' };
  
  // Chamar edge function send-push-notification diretamente
  const { data, error } = await supabase.functions.invoke('send-push-notification', {
    body: {
      user_id: user.id,
      title: '🔔 Teste de Push',
      body: 'Se você está vendo isso, as notificações funcionam!',
      data: { action_url: '/settings', test: 'true' },
    }
  });
  
  return { success: !error, data, error };
}, [user, token]);
```

### 3. Estrutura Visual (baseada na imagem de referência)

```text
┌─────────────────────────────────────────────────────────┐
│ 📱 Push Notifications                                   │
│ Receba notificações em tempo real no celular            │
├─────────────────────────────────────────────────────────┤
│ Status do dispositivo                      [🟢 Ativo]   │
│ Este dispositivo está recebendo notificações push       │
│                                                         │
│ [Desativar Push]  [📤 Testar]                          │
│                                                         │
│ 🔊 Som de notificação                           [ON]    │
│ Tocar som quando novos leads chegarem                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ⚙️ Diagnóstico Firebase             [🔄 Atualizar]     │
│ Informações técnicas para debug                         │
├─────────────────────────────────────────────────────────┤
│ Dispositivo iOS          │            Sim ⊞             │
│ Modo PWA (Tela Início)   │            Sim ⊞             │
│ User ID (Supabase)       │    03755812-224d... ⊞        │
│ FCM Token                │    ...APA91bGOXr7... ⊞       │
│ Service Worker           │           active ⊞           │
│ Permissão                │          granted ⊞           │
│ Inscrito                 │              Sim ⊞           │
│ Última atualização       │         22:46:12 ⊞           │
├─────────────────────────────────────────────────────────┤
│ Token FCM Completo (para testes)                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ cRug8Z9ql80NKV8xGElkEb:APA91bGOXr7OI5_va4Mgt8eXBq │ │
│ │ 3v5Elgs9E5dqSU5Za2Dn35HbWwEY2Jsq9qFCFditsloXE2Iv │ │
│ └─────────────────────────────────────────────────────┘ │
│ [📋 Copiar Token]                                       │
├─────────────────────────────────────────────────────────┤
│ Limpar tokens antigos                    [🗑️ Limpar]   │
│ Remove tokens obsoletos do banco                        │
│                                                         │
│ Atualizar Service Worker                [🔄 Atualizar]  │
│ Força atualização do SW para versão mais recente        │
├─────────────────────────────────────────────────────────┤
│ Logs em Tempo Real                                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [22:46:12] ✅ FCM reconectado com sucesso           │ │
│ │ [22:46:11] Token FCM válido, reconectando...        │ │
│ │ [22:46:10] Inicializando FCM Provider...            │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Passos de Implementação

1. **Criar `PushDiagnostics.tsx`**
   - Componente com todas as informações de diagnóstico
   - Estado local para logs
   - Botões de ação (testar, limpar, atualizar SW)
   - Funcionalidade de copiar para clipboard

2. **Modificar `usePushNotifications.tsx`**
   - Adicionar `sendTestPush()` para enviar notificação de teste
   - Adicionar `getSwStatus()` para verificar status do Service Worker
   - Adicionar `clearOldTokens()` para limpar tokens antigos

3. **Modificar `NotificationPreferences.tsx`**
   - Importar e renderizar `PushDiagnostics` dentro de `PushNotificationSection`
   - Passar props necessárias

4. **Adicionar botão "Testar" na seção principal**
   - Ao lado do botão "Desativar Push"
   - Chama `sendTestPush()` e mostra resultado

---

## Resultado Esperado

Após implementação:
- Você terá visibilidade completa do estado do push no dispositivo
- Poderá enviar notificação de teste diretamente
- Verá logs em tempo real do processo
- Poderá limpar tokens antigos e forçar atualização do SW
- Identificar se o problema é client-side ou server-side
