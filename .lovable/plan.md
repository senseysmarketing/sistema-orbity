

# Correção: Push Notifications Não Disparam

## Problema Identificado

O trigger `trigger_push_on_notification` está falhando com o erro:

```
WARNING: Push notification trigger failed: function extensions.http_post(url => text, body => text, headers => text) does not exist
```

### Causa Raiz

A função está usando a sintaxe incorreta:

| Atual (Errado) | Correto |
|----------------|---------|
| `extensions.http_post()` | `net.http_post()` |
| `body := jsonb::text` | `body := jsonb` |
| `headers := jsonb::text` | `headers := jsonb` |

A extensão `pg_net` (versão 0.19.5) está instalada corretamente, mas a função usa o schema `extensions` ao invés de `net`.

---

## Solução

Atualizar a função `trigger_push_on_notification` para usar a sintaxe correta da extensão `pg_net`.

### Nova Função

```sql
CREATE OR REPLACE FUNCTION public.trigger_push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'net'
AS $$
BEGIN
  -- Chamar edge function send-push-notification via pg_net
  PERFORM net.http_post(
    url := 'https://ovookkywclrqfmtumelw.supabase.co/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'user_id', NEW.user_id::text,
      'title', NEW.title,
      'body', NEW.message,
      'data', jsonb_build_object(
        'type', NEW.type,
        'action_url', COALESCE(NEW.action_url, '/dashboard'),
        'notification_id', NEW.id::text,
        'play_sound', COALESCE((NEW.metadata->>'play_sound')::text, 'false')
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    timeout_milliseconds := 5000
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Push notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;
```

### Mudanças Principais

1. **Schema correto**: `net.http_post()` ao invés de `extensions.http_post()`
2. **Tipos corretos**: `body` e `headers` como `jsonb` direto (sem converter para text)
3. **URL hardcoded**: Removidas dependências de settings que podem não existir
4. **Timeout explícito**: 5 segundos para evitar travamentos

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| Nova migration SQL | Recriar a função com sintaxe correta |

---

## Teste Esperado

Após a correção:

1. Criar/atualizar uma tarefa atribuída a você
2. A notificação aparecerá na central E chegará como push no iPhone
3. Os logs da edge function `send-push-notification` mostrarão a chamada

