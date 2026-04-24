# Plano: Otimização do Hook useBrowserNotifications.tsx

## Objetivo
Refatorar o hook de notificações locais do navegador com 4 melhorias enterprise: Deep Linking, Deduplicação, Feedback Sonoro e Auto-Encerramento.

## Alterações Técnicas

### 1. Interface Estendida (CustomNotificationOptions)
```typescript
interface CustomNotificationOptions extends NotificationOptions {
  action_url?: string;  // URL para navegação no clique
  silent?: boolean;     // Controla feedback sonoro
  tag?: string;         // Deduplicação (SO sobrescreve notificações com mesma tag)
}
```

### 2. Deep Linking (Navegação Dinâmica)
- Atualizar `notification.onclick` para:
  - `window.focus()` - trazer janela para frente
  - Se `action_url` presente: `window.location.href = action_url`
  - `notification.close()` - fechar após clique

### 3. Deduplicação Inteligente (Tag)
- A propriedade `tag` é repassada ao `new Notification()` via spread
- Sistema Operacional (macOS/Windows) automaticamente sobrescreve notificações antigas com mesma tag
- Exemplo uso: `tag: 'approvals'` para evitar spam de aprovações

### 4. Feedback Sonoro Embutido
```typescript
if (!options?.silent) {
  const audio = new Audio('/notification.mp3');
  audio.play().catch(() => {}); // Previne erros de autoplay
}
```
- Som condicional (respeita flag `silent`)
- Arquivo `/notification.mp3` já existe na pasta public

### 5. Auto-Encerramento de Segurança
```typescript
setTimeout(() => notification.close(), 6000);
```
- Fecha automaticamente após 6 segundos
- Previne notificações "presas" no ecrã

## Arquivo Impactado
| Arquivo | Ação |
|---------|------|
| `src/hooks/useBrowserNotifications.tsx` | Refatoração completa (66 linhas) |

## Código Final Esperado
```typescript
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CustomNotificationOptions extends NotificationOptions {
  action_url?: string;
  silent?: boolean;
  tag?: string;
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => { /* mantido */ };

  const showNotification = (title: string, options?: CustomNotificationOptions) => {
    if (permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,  // tag passada aqui para deduplicação SO
      });

      if (!options?.silent) {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {});
      }

      notification.onclick = () => {
        window.focus();
        if (options?.action_url) {
          window.location.href = options.action_url;
        }
        notification.close();
      };

      setTimeout(() => notification.close(), 6000);

      return notification;
    }
    return null;
  };

  return { permission, requestPermission, showNotification };
}
```

## Benefícios
- ✨ **Deep Linking**: Clique vai direto para a tarefa/lead/reunião
- 🔄 **Deduplicação**: Tags evitam spam de notificações repetidas
- 🔊 **Sonoro**: Alerta sonoro garante percepção mesmo em outra aba
- ⏱️ **Auto-close**: Notificações não ficam presas indefinidamente

Posso executar?