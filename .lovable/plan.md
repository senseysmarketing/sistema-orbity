

# Excluir o Autor da Ação das Notificações de Status

## Problema Identificado

Atualmente, quando um usuário muda o status de uma tarefa ou post, **todos** os envolvidos recebem notificação, incluindo quem fez a ação. Isso é redundante e irritante.

### Situação Atual (Incorreta)

| Cenário | Quem recebe notificação |
|---------|------------------------|
| João move tarefa para "Concluído" | João (desnecessário), Maria (criadora), Pedro (outro atribuído) |
| Maria publica post | Maria (desnecessário), João (outro atribuído) |

### Comportamento Desejado

| Cenário | Quem recebe notificação |
|---------|------------------------|
| João move tarefa para "Concluído" | Maria (criadora), Pedro (outro atribuído) - **João não recebe** |
| Maria publica post | João (outro atribuído) - **Maria não recebe** |

---

## Análise Técnica

### Problema Raiz
Os triggers de banco (`notify_task_update_events`, `notify_post_update_events`) **não sabem quem fez a alteração** porque as tabelas não possuem um campo que rastreie isso.

### Solução
1. Adicionar campo `updated_by UUID` nas tabelas `tasks` e `social_media_posts`
2. Atualizar o frontend para enviar o ID do usuário logado no `updated_by` quando fizer updates
3. Modificar os triggers para excluir `updated_by` da lista de notificados

---

## Implementação

### 1. Migração de Banco de Dados

Adicionar campo `updated_by` às tabelas:

```sql
-- Adicionar campo updated_by às tabelas
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_updated_by ON tasks(updated_by);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_updated_by ON social_media_posts(updated_by);
```

### 2. Atualizar Trigger `notify_task_update_events`

```sql
CREATE OR REPLACE FUNCTION public.notify_task_update_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_agency_id uuid := NEW.agency_id;
  v_updated_by uuid := NEW.updated_by;  -- Quem fez a ação
  v_status_changed boolean := (OLD.status IS DISTINCT FROM NEW.status);
  v_important_changed boolean := (...);
  assignee record;
  v_event_key text;
  v_creator_is_assignee boolean := false;
BEGIN
  IF v_agency_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_status_changed THEN
    v_event_key := 'task.status_changed';

    -- Notificar atribuídos EXCETO quem fez a ação
    FOR assignee IN
      SELECT user_id FROM public.task_assignments WHERE task_id = NEW.id
    LOOP
      -- Pular se for quem fez a ação
      IF assignee.user_id = v_updated_by THEN
        CONTINUE;
      END IF;
      
      IF public.should_notify_user_for_event(assignee.user_id, v_agency_id, 'tasks', v_event_key) THEN
        -- Inserir notificação...
      END IF;
    END LOOP;

    -- Notificar criador EXCETO se ele fez a ação ou já é atribuído
    IF NEW.created_by IS NOT NULL 
       AND NEW.created_by <> v_updated_by 
       AND NOT v_creator_is_assignee THEN
      -- Inserir notificação para criador...
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
```

### 3. Atualizar Trigger `notify_post_update_events`

Mesma lógica: verificar `NEW.updated_by` e pular esse usuário nas notificações.

### 4. Atualizar Frontend - Hook `useSocialMediaPosts.tsx`

```typescript
const updatePost = async (id: string, updates: Partial<SocialMediaPost>) => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const finalUpdates: any = { 
      ...updates,
      updated_by: userId  // <-- Novo: passa quem fez a ação
    };

    const { data, error } = await supabase
      .from('social_media_posts')
      .update(finalUpdates)
      .eq('id', id)
      .select(...)
      .single();
    // ...
  }
};
```

### 5. Atualizar Frontend - Hook de Tarefas (useTasks ou similar)

Mesma lógica para tarefas.

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| **Nova migração SQL** | Adicionar `updated_by` nas tabelas |
| **Nova migração SQL** | Atualizar triggers para excluir `updated_by` |
| `src/hooks/useSocialMediaPosts.tsx` | Passar `updated_by` no `updatePost()` |
| `src/hooks/useTasks.tsx` ou similar | Passar `updated_by` nas funções de update |

---

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│ João move tarefa "Relatório" para "Concluído"                   │
├─────────────────────────────────────────────────────────────────┤
│ Frontend:                                                       │
│   updateTask(id, { status: 'done', updated_by: 'joao-uuid' })   │
│                                                                 │
│ Trigger:                                                        │
│   NEW.updated_by = 'joao-uuid'                                  │
│                                                                 │
│   FOR assignee IN task_assignments:                             │
│     IF assignee.user_id = 'joao-uuid' THEN SKIP (é ele mesmo)   │
│     IF assignee.user_id = 'pedro-uuid' THEN NOTIFY ✓            │
│                                                                 │
│   IF created_by = 'maria-uuid' AND 'maria-uuid' <> 'joao-uuid': │
│     NOTIFY Maria ✓                                              │
└─────────────────────────────────────────────────────────────────┘

Resultado:
  ✓ Pedro recebe notificação
  ✓ Maria recebe notificação  
  ✗ João NÃO recebe (ele fez a ação)
```

---

## Casos de Borda Tratados

| Cenário | Comportamento |
|---------|---------------|
| Usuário move sua própria tarefa | Não recebe notificação |
| Criador move tarefa que ele também está atribuído | Não recebe notificação |
| Sistema atualiza sem `updated_by` (null) | Todos recebem (comportamento atual como fallback) |
| Admin move tarefa de outro usuário | Atribuídos e criador recebem, admin não |

---

## Benefícios

1. **Menos ruído** - Usuários não são notificados de suas próprias ações
2. **Melhor UX** - Notificações são realmente relevantes
3. **Rastreabilidade** - Campo `updated_by` permite auditoria de quem fez alterações

