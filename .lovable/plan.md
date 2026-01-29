

# Correção: Push Notifications Não Funcionam para Suellen (Android)

## Problema Identificado

A usuária Suellen está com **todos os tokens FCM marcados como `is_active: false`** no banco de dados. O Firebase está rejeitando todos os tokens com erro **"UNREGISTERED"** (404).

### Sequência do Problema

```text
1. Suellen ativa push notifications
2. Token FCM é gerado e salvo como is_active: true
3. Ao enviar teste, FCM retorna "UNREGISTERED"  
4. Edge function marca token como is_active: false
5. RESULTADO: Todos os tokens ficam inativos
6. Próximo teste: "No active push subscriptions"
```

### Dados do Banco (push_subscriptions para user_id `7a1901f0...`)

| Token (sufixo) | Status | Atualizado |
|----------------|--------|------------|
| `...APA91bGJVRHWYko9...` | INATIVO | 13:47:53 |
| `...APA91bEMsaw2Lwfi...` | INATIVO | 13:47:51 |
| `...APA91bGMmfrk_LA1...` | INATIVO | 13:47:51 |
| `...APA91bELHjpybYpG...` | INATIVO | 13:47:51 |
| `...APA91bExmVCOlF_D...` | INATIVO | 13:47:51 |

**Todos os 5 tokens foram invalidados pelo FCM em segundos!**

---

## Causa Raiz

### Problema 1: Token FCM sendo rejeitado imediatamente

O erro "UNREGISTERED" do Firebase indica que:
- O Service Worker não está registrado corretamente no Firebase
- Ou o token foi gerado por um SW que foi substituído
- Ou há conflito entre múltiplos Service Workers

### Problema 2: UX ruim no teste de push

O botão "Testar Push" fica carregando infinitamente porque:
- A edge function retorna `{ sent: 0, total: 1, errors: [...] }`
- O componente espera `data.results` que não existe
- O estado `isTestingPush` não sai de loading quando há erro parcial

---

## Soluções Propostas

### Correção 1: Melhorar tratamento de resposta no PushDiagnostics

Atualizar o componente para tratar corretamente todos os cenários de resposta:

```typescript
// ANTES (incompleto)
if (data?.results) {
  // só processa se results existir
}

// DEPOIS (completo)
if (data) {
  if (data.sent === 0 && data.total > 0) {
    addLog(`Falha: 0/${data.total} enviados`, 'error');
    if (data.errors?.length > 0) {
      data.errors.forEach((err: string) => {
        addLog(`Erro FCM: ${err.substring(0, 100)}...`, 'error');
      });
    }
    toast({
      title: "Push falhou",
      description: "Token pode estar expirado. Tente reativar.",
      variant: "destructive",
    });
  } else if (data.sent > 0) {
    addLog(`Sucesso: ${data.sent}/${data.total} enviados ✓`, 'success');
    toast({ 
      title: "Teste enviado!", 
      description: "Aguarde alguns segundos pela notificação." 
    });
  }
}
```

### Correção 2: Adicionar botão "Reativar Push" no diagnóstico

Quando o teste falha com "UNREGISTERED", oferecer opção de:
1. Limpar todos os tokens antigos
2. Forçar novo registro do Service Worker
3. Gerar um novo token FCM e salvar como ativo

### Correção 3: Melhorar registro do Service Worker para Android

No hook `usePushNotifications`, garantir que:
- O SW do Firebase seja registrado com escopo correto
- Não haja conflito com o SW do PWA (vite-plugin-pwa)
- O token seja gerado apenas após SW estar definitivamente ativo

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/notifications/PushDiagnostics.tsx` | Melhorar tratamento de resposta da edge function, mostrar erros detalhados, adicionar botão "Reativar Push" |
| `src/hooks/usePushNotifications.tsx` | Adicionar lógica de retry em caso de falha, verificar estado do SW antes de gerar token |

---

## Solução Imediata para Suellen

Enquanto implementamos as correções, a Suellen pode tentar:

1. **Limpar dados da PWA**:
   - Ir em Configurações do Android > Apps > Orbity > Armazenamento > Limpar dados
   - Ou desinstalar e reinstalar a PWA

2. **Limpar cache do Chrome**:
   - Abrir Chrome > Configurações > Privacidade > Limpar dados de navegação
   - Selecionar "Cookies" e "Arquivos em cache"

3. **Reinstalar a PWA**:
   - Remover o ícone do Orbity da tela inicial
   - Acessar o site novamente
   - Adicionar à tela inicial
   - Ativar notificações novamente

---

## Implementação Técnica

### 1. Melhorar `sendTestPush` no PushDiagnostics

```typescript
const sendTestPush = async () => {
  if (!user) {
    addLog('Usuário não autenticado', 'error');
    return;
  }

  setIsTestingPush(true);
  addLog('Enviando notificação de teste...', 'info');

  try {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: user.id,
        title: '🔔 Teste de Push',
        body: 'Se você está vendo isso, as notificações funcionam!',
        data: { 
          action_url: '/settings', 
          test: 'true',
          play_sound: 'true'
        },
      }
    });

    if (error) {
      addLog(`Erro do servidor: ${error.message}`, 'error');
      toast({ 
        title: "Erro ao enviar teste", 
        description: error.message,
        variant: "destructive" 
      });
      return;
    }
    
    // NOVO: Tratar resposta corretamente
    if (data) {
      if (data.sent === 0) {
        if (data.total === 0) {
          addLog('Nenhuma subscription ativa encontrada', 'warning');
          toast({ 
            title: "Sem tokens ativos", 
            description: "Tente clicar em 'Desativar' e depois reativar as notificações.",
            variant: "destructive" 
          });
        } else {
          addLog(`Falha: 0/${data.total} enviados - token pode estar expirado`, 'error');
          if (data.errors?.length > 0) {
            const firstError = data.errors[0];
            if (firstError.includes('UNREGISTERED')) {
              addLog('Token UNREGISTERED - precisa reativar push', 'error');
              toast({ 
                title: "Token expirado", 
                description: "Desative e ative novamente as notificações push.",
                variant: "destructive" 
              });
            }
          }
        }
      } else {
        addLog(`Sucesso: ${data.sent}/${data.total} enviados ✓`, 'success');
        toast({ 
          title: "Teste enviado!", 
          description: "Aguarde alguns segundos pela notificação." 
        });
      }
    }
  } catch (error: any) {
    addLog(`Exceção: ${error.message}`, 'error');
    toast({ 
      title: "Erro ao enviar teste", 
      description: error.message,
      variant: "destructive" 
    });
  } finally {
    setIsTestingPush(false);
  }
};
```

### 2. Adicionar função de reativação forçada

```typescript
const forceReactivate = async () => {
  addLog('Forçando reativação...', 'info');
  
  try {
    // 1. Limpar todos os tokens do usuário
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user?.id);
    
    addLog('Tokens antigos removidos', 'success');
    
    // 2. Unregister SW atual
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      if (reg.active?.scriptURL?.includes('firebase')) {
        await reg.unregister();
        addLog('SW Firebase removido', 'success');
      }
    }
    
    // 3. Registrar novo SW
    const newReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    addLog('Novo SW registrado', 'success');
    
    // 4. Aguardar ativação
    await navigator.serviceWorker.ready;
    addLog('SW pronto', 'success');
    
    toast({
      title: "Pronto!",
      description: "Agora clique em 'Ativar' nas configurações de push.",
    });
  } catch (error: any) {
    addLog(`Erro: ${error.message}`, 'error');
  }
};
```

---

## Benefícios

1. **Feedback claro para o usuário** - Sabe exatamente o que deu errado
2. **Opção de auto-recuperação** - Botão para reativar sem reinstalar PWA
3. **Logs detalhados** - Facilita debug de problemas futuros
4. **Tratamento de edge cases** - Tokens expirados, SW conflitantes, etc.

