
# Correção: Erro "record 'new' has no field 'updated_by'" ao Mover Posts

## Problema Identificado

A função de trigger `notify_post_update_events` foi criada com referências a colunas que **não existem** na tabela `social_media_posts`:

| Campo no Trigger | Existe na Tabela? | Problema |
|------------------|-------------------|----------|
| `NEW.updated_by` | Nao | Causa o erro |
| `NEW.client_ids` (array) | Nao | Deveria usar `NEW.client_id` (singular) |
| `NEW.scheduled_for` | Nao | Deveria usar `NEW.scheduled_date` |

Quando um post e movido entre colunas no Kanban, o trigger e disparado e tenta acessar `NEW.updated_by`, causando o erro:

```text
record "new" has no field "updated_by"
```

---

## Solucao

Atualizar a funcao `notify_post_update_events` para usar os campos corretos da tabela `social_media_posts`:

### Mudancas Necessarias

1. **Remover referencias a `NEW.updated_by`**
   - A tabela nao rastreia quem fez a ultima atualizacao
   - Usar `created_by` como fallback ou deixar `v_updater_name` como "Alguem"

2. **Corrigir `NEW.client_ids` para `NEW.client_id`**
   - A tabela usa campo singular `client_id`, nao array
   - Ajustar logica para buscar cliente unico

3. **Corrigir `NEW.scheduled_for` para `NEW.scheduled_date`**
   - O nome correto do campo na tabela

---

## Detalhes Tecnicos

### Estrutura Atual da Tabela social_media_posts

```sql
-- Campos relevantes que EXISTEM:
client_id       uuid      -- Singular, nao array
scheduled_date  timestamptz
created_by      uuid
-- NAO existem: updated_by, client_ids, scheduled_for
```

### Funcao Corrigida

```sql
CREATE OR REPLACE FUNCTION public.notify_post_update_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_key TEXT;
  v_recipients UUID[];
  v_post_title TEXT;
  v_old_status TEXT;
  v_new_status TEXT;
  v_client_name TEXT;
BEGIN
  -- Get post title
  v_post_title := COALESCE(NEW.title, 'Post sem titulo');
  
  -- Get client name (singular client_id)
  IF NEW.client_id IS NOT NULL THEN
    SELECT name INTO v_client_name
    FROM clients
    WHERE id = NEW.client_id;
  END IF;
  
  v_old_status := CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END;
  v_new_status := NEW.status;

  -- STATUS CHANGE EVENT
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_event_key := 'post.status_changed';
    
    SELECT ARRAY_AGG(user_id) INTO v_recipients
    FROM post_assignments
    WHERE post_id = NEW.id;
    
    -- Include creator if not in recipients
    IF NEW.created_by IS NOT NULL THEN
      IF v_recipients IS NULL THEN
        v_recipients := ARRAY[NEW.created_by];
      ELSIF NOT (NEW.created_by = ANY(v_recipients)) THEN
        v_recipients := array_append(v_recipients, NEW.created_by);
      END IF;
    END IF;
    
    -- Notify recipients (excluding creator to avoid self-notification on own actions)
    IF v_recipients IS NOT NULL THEN
      DECLARE
        v_recipient_id UUID;
      BEGIN
        FOREACH v_recipient_id IN ARRAY v_recipients LOOP
          IF public.should_notify_user_for_event(v_recipient_id, NEW.agency_id, 'posts', v_event_key) THEN
            INSERT INTO public.notifications (
              user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
            ) VALUES (
              v_recipient_id,
              NEW.agency_id,
              'post',
              'medium',
              '🔄 Status de post atualizado',
              v_post_title,
              '/dashboard/social-media',
              'Ver post',
              jsonb_build_object(
                'event', v_event_key, 
                'post_id', NEW.id, 
                'from', v_old_status, 
                'to', v_new_status,
                'client_name', v_client_name
              )
            );
          END IF;
        END LOOP;
      END;
    END IF;
    
    -- Apply agency rules for published posts
    IF v_new_status = 'published' THEN
      PERFORM public.apply_post_event_rules(
        NEW.agency_id, 
        'post.published', 
        jsonb_build_object('post_id', NEW.id)
      );
    END IF;
  END IF;

  -- IMPORTANT FIELDS UPDATED
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    IF NEW.title IS DISTINCT FROM OLD.title OR
       NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date OR
       NEW.priority IS DISTINCT FROM OLD.priority THEN
      
      v_event_key := 'post.updated_important';
      
      SELECT ARRAY_AGG(user_id) INTO v_recipients
      FROM post_assignments
      WHERE post_id = NEW.id;
      
      IF v_recipients IS NOT NULL THEN
        DECLARE
          v_recipient_id UUID;
        BEGIN
          FOREACH v_recipient_id IN ARRAY v_recipients LOOP
            IF public.should_notify_user_for_event(v_recipient_id, NEW.agency_id, 'posts', v_event_key) THEN
              INSERT INTO public.notifications (
                user_id, agency_id, type, priority, title, message, action_url, action_label, metadata
              ) VALUES (
                v_recipient_id,
                NEW.agency_id,
                'post',
                'low',
                '✏️ Post atualizado',
                v_post_title,
                '/dashboard/social-media',
                'Ver post',
                jsonb_build_object('event', v_event_key, 'post_id', NEW.id)
              );
            END IF;
          END LOOP;
        END;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
```

---

## Arquivos a Modificar

| Arquivo/Local | Mudanca |
|---------------|---------|
| Migracao SQL | Criar nova migracao para atualizar a funcao `notify_post_update_events` |

---

## Resultado Esperado

| Cenario | Antes | Depois |
|---------|-------|--------|
| Mover post entre colunas | Erro "no field updated_by" | Funciona normalmente |
| Notificacoes de status | Nao funcionavam | Funcionam corretamente |
| Mudancas importantes | Erro | Funcionam corretamente |

---

## Observacoes

1. **Por que nao adicionar a coluna `updated_by`?**
   - Seria uma mudanca maior que afeta toda a aplicacao
   - Todos os UPDATE precisariam passar `updated_by`
   - A solucao mais simples e corrigir o trigger

2. **Consistencia com tasks**
   - O trigger de tasks (`notify_task_update_events`) nao usa `updated_by`
   - Mantemos o mesmo padrao para posts
