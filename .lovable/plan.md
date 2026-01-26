
# Diagnóstico: Push Notifications Não Funcionando

## Problema Identificado

As notificações push não estão chegando ao seu iPhone porque **falta uma conexão** entre a inserção de notificações no banco de dados e a edge function que envia push.

### Fluxo Atual (Incompleto)

```
Tarefa Atribuída
      ↓
Trigger PostgreSQL (notify_task_assignment)
      ↓
Insere na tabela "notifications" ✅
      ↓
      ❌ PARA AQUI - Notificação fica só na central
```

### O Que Deveria Acontecer

```
Tarefa Atribuída
      ↓
Trigger PostgreSQL (notify_task_assignment)
      ↓
Insere na tabela "notifications"
      ↓
Trigger/Webhook dispara edge function "send-push-notification"
      ↓
FCM envia push para seu iPhone ✅
```

---

## Evidências Encontradas

| Item | Status |
|------|--------|
| Token FCM do seu iPhone | ✅ Registrado corretamente |
| Permissão de notificação | ✅ Concedida |
| Notificação no banco | ✅ Criada às 20:48 |
| Edge function `send-push-notification` | ✅ Funcional |
| Logs da edge function | ❌ Vazios (nunca foi chamada) |
| Trigger para chamar push | ❌ **Não existe** |

---

## Solução Proposta

Criar um **Database Webhook** que chama automaticamente a edge function `send-push-notification` sempre que uma nova notificação é inserida.

### Implementação Técnica

#### 1. Criar Extensão pg_net (se não existir)

Habilitar a extensão `pg_net` no Supabase para fazer chamadas HTTP a partir de triggers.

#### 2. Criar Função que Dispara Push

```sql
CREATE OR REPLACE FUNCTION trigger_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Chama a edge function send-push-notification via pg_net
  PERFORM net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'data', jsonb_build_object(
        'type', NEW.type,
        'action_url', COALESCE(NEW.action_url, '/dashboard'),
        'notification_id', NEW.id::text,
        'play_sound', COALESCE((NEW.metadata->>'play_sound')::text, 'false')
      )
    )
  );
  
  RETURN NEW;
END;
$$;
```

#### 3. Criar Trigger na Tabela Notifications

```sql
CREATE TRIGGER trg_push_on_new_notification
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION trigger_push_on_notification();
```

### Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Nova migration SQL | Criar extensão pg_net + função + trigger |

---

## Resultado Esperado

Após a implementação:

1. **Qualquer notificação** (tarefas, posts, reuniões, leads, etc.) que for inserida no banco automaticamente disparará push
2. As notificações chegarão ao seu iPhone mesmo com o app fechado
3. O fluxo será instantâneo (tempo real)

---

## Considerações iOS Específicas

Para push notifications funcionarem no iOS:

- ✅ Você está usando iOS 18.7 (suportado desde iOS 16.4)
- ✅ PWA precisa estar instalado na tela inicial
- ✅ Token FCM está registrado
- ⚠️ Certifique-se de que o app foi instalado via Safari (não Chrome/outro)
- ⚠️ Verifique em Ajustes > Notificações se o Orbity tem permissão

---

## Alternativa Mais Simples (Fallback)

Se a extensão `pg_net` não estiver disponível, podemos usar um **Supabase Database Webhook** configurado via dashboard, ou modificar os triggers existentes para usar a extensão `http` do Supabase.
