
# Correção de Duplicidade de Notificações

## Resumo dos Problemas Identificados

Após análise detalhada do código e dos dados no banco, identifiquei **3 causas principais** de duplicação:

| # | Problema | Local | Impacto |
|---|----------|-------|---------|
| 1 | Criador que também é assignee recebe 2 notificações | Triggers SQL (posts/tasks) | Alta: duplicação em eventos de status |
| 2 | Edge function executando em paralelo | `process-notifications` | Alta: duplicações em "Post/Tarefa próximo do prazo" |
| 3 | Falta de deduplicação por user+entity | `processPosts()` e `processTasks()` | Média: sem controle granular por usuário |

---

## Solução Técnica

### 1. Corrigir Triggers SQL - Evitar notificar criador se já for assignee

**Arquivos**: Nova migration SQL para atualizar `notify_post_update_events()` e `notify_task_update_events()`

**Antes** (lógica atual - DUPLICA):
```sql
-- Notifica todos os assignees
FOR assignee IN SELECT user_id FROM post_assignments WHERE post_id = NEW.id
LOOP
  INSERT INTO notifications...
END LOOP;

-- Depois notifica o criador separadamente (DUPLICA se criador = assignee)
IF NEW.created_by IS NOT NULL THEN
  INSERT INTO notifications...
END IF;
```

**Depois** (lógica corrigida):
```sql
-- Notifica todos os assignees
FOR assignee IN SELECT user_id FROM post_assignments WHERE post_id = NEW.id
LOOP
  INSERT INTO notifications...
END LOOP;

-- Notifica o criador APENAS se NÃO for assignee
IF NEW.created_by IS NOT NULL THEN
  -- Verifica se o criador NÃO está na lista de assignees
  IF NOT EXISTS (
    SELECT 1 FROM post_assignments 
    WHERE post_id = NEW.id AND user_id = NEW.created_by
  ) THEN
    INSERT INTO notifications...
  END IF;
END IF;
```

---

### 2. Adicionar Lock de Processamento na Edge Function

**Arquivo**: `supabase/functions/process-notifications/index.ts`

Adicionar um sistema de "lock" usando a tabela `notification_tracking` para evitar execuções paralelas:

```typescript
// No início da função processPosts()
const lockKey = `process_posts_${new Date().toISOString().split('T')[0]}`;
const { data: existingLock } = await supabase
  .from('notification_tracking')
  .select('last_sent_at')
  .eq('notification_type', 'process_lock')
  .eq('entity_id', lockKey)
  .single();

// Se executou nos últimos 30 segundos, pular
if (existingLock) {
  const lastRun = new Date(existingLock.last_sent_at);
  if ((Date.now() - lastRun.getTime()) < 30000) {
    console.log('[Posts] Skipping - another process ran recently');
    return;
  }
}

// Adquirir lock
await supabase.from('notification_tracking').upsert({
  notification_type: 'process_lock',
  entity_id: lockKey,
  user_id: '00000000-0000-0000-0000-000000000000',
  agency_id: '00000000-0000-0000-0000-000000000000',
  last_sent_at: new Date().toISOString()
}, { onConflict: 'notification_type,entity_id,user_id' });
```

---

### 3. Usar Deduplicação por User+Post/Task

**Arquivo**: `supabase/functions/process-notifications/index.ts`

Modificar `processPosts()` e `processTasks()` para usar o sistema de batch tracking que já existe:

```typescript
// Antes de criar notificações, verificar quais já foram enviadas
const trackingRecords: BatchTrackingRecord[] = notificationsToCreate.map(n => ({
  notification_type: 'post_upcoming', // ou 'task_upcoming'
  entity_id: n.metadata.post_id,
  user_id: n.user_id,
  agency_id: n.agency_id,
}));

const recentlySent = await batchCheckNotifications(trackingRecords, 24);

// Filtrar notificações que já foram enviadas
const filteredNotifications = notificationsToCreate.filter(n => {
  const key = `${n.metadata.post_id}_${n.user_id}`;
  return !recentlySent.has(key);
});

await batchCreateNotifications(filteredNotifications);
await batchTrackNotifications(trackingRecords.filter(r => 
  !recentlySent.has(`${r.entity_id}_${r.user_id}`)
));
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Nova migration SQL | Atualizar `notify_post_update_events()` e `notify_task_update_events()` para não duplicar quando criador = assignee |
| `supabase/functions/process-notifications/index.ts` | Adicionar lock de processamento + usar batch tracking para posts/tasks |

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Criador que é assignee (status changed) | 2 notificações | 1 notificação |
| Edge function chamada 2x em paralelo | Duplica tudo | Segunda execução ignorada |
| "Post próximo de publicar" | Pode duplicar | Deduplicado por user+post |
| "Tarefa próxima do prazo" | Pode duplicar | Deduplicado por user+task |

---

## Diagrama do Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE NOTIFICAÇÕES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRIGGERS (tempo real - eventos)                                │
│  ───────────────────────────────                                │
│  task_assignments INSERT → notify_task_assignment()             │
│       └─ Notifica assignee                                      │
│                                                                 │
│  tasks UPDATE → notify_task_update_events()                     │
│       ├─ Notifica assignees                                     │
│       └─ Notifica criador SE NÃO for assignee ← CORREÇÃO        │
│                                                                 │
│  (mesmo para posts)                                             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  EDGE FUNCTION (cron - lembretes)                               │
│  ─────────────────────────────────                              │
│  process-notifications (a cada hora)                            │
│       ├─ Verificar lock (30s) ← NOVA PROTEÇÃO                   │
│       ├─ processReminders()                                     │
│       ├─ processTasks() + batch tracking ← CORREÇÃO             │
│       ├─ processPosts() + batch tracking ← CORREÇÃO             │
│       └─ ...                                                    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PUSH NOTIFICATIONS                                             │
│  ──────────────────                                             │
│  notifications INSERT → trg_push_on_new_notification            │
│       └─ Chama send-push-notification (1 push por registro)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Observações Técnicas

1. **Por que usar lock de 30 segundos?**
   - O cron pode disparar múltiplas instâncias quase simultaneamente
   - 30s é suficiente para uma execução completa, mas curto o bastante para não bloquear execuções legítimas

2. **Por que não usar UNIQUE constraint?**
   - Seria mais drástico e poderia causar erros silenciosos
   - O batch tracking permite controle mais granular (ex: reenviar após 24h)

3. **Push notifications não duplicam?**
   - Correto! O trigger `trg_push_on_new_notification` só dispara 1x por INSERT
   - Se houver 2 notificações duplicadas no banco, haverá 2 pushes (corrigimos na origem)
