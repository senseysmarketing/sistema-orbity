

# Refatoracao do Sistema de Notificacoes — Anti-Duplicidade, Abas por Tipo e Rich Actions

## 1. Migration SQL — Blindagem contra duplicidades

Adicionar 3 colunas na tabela `notifications` e criar constraint unico:

```sql
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS action_type TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS unique_notification_event
  ON public.notifications (user_id, entity_type, entity_id, action_type)
  WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL AND action_type IS NOT NULL;
```

Uso de partial unique index (em vez de UNIQUE constraint) para nao bloquear notificacoes legacy que nao possuem esses campos.

## 2. Atualizar DB Functions que criam notificacoes

Alterar as 3 funcoes Postgres que fazem INSERT INTO notifications para incluir `entity_type`, `entity_id`, `action_type`:

- **`notify_task_assignment()`**: entity_type='task', entity_id=task_id, action_type='assigned'
- **`notify_task_update_events()`**: entity_type='task', entity_id=task_id, action_type='status_changed' ou 'updated_important'
- **`apply_task_event_rules()`**: entity_type='task', entity_id=task_id, action_type=event_key

Todos os INSERTs ganham `ON CONFLICT ON CONSTRAINT ... DO NOTHING` (usando o partial index).

## 3. Atualizar Edge Function `process-notifications`

- Adicionar `entity_type`, `entity_id`, `action_type` ao `NotificationData` interface
- No `processMeetings()`: preencher entity_type='meeting', entity_id=meeting.id, action_type='reminder'
- No `batchCreateNotifications()`: usar `.upsert(..., { onConflict: 'user_id,entity_type,entity_id,action_type', ignoreDuplicates: true })` ou tratar erro de constraint

## 4. Refatorar NotificationCenter.tsx — Abas por tipo

Substituir as abas atuais (Todas / Nao lidas / Hoje) por:

**Todas | Reunioes | Tarefas | Alertas**

- "Reunioes": filtra type === 'meeting'
- "Tarefas": filtra type === 'task'
- "Alertas": filtra type in ('payment', 'expense', 'system', 'reminder')
- Manter botao "Marcar todas como lidas" e "Nao Lidas" como filtro secundario (checkbox ou toggle)

## 5. Refatorar NotificationItem.tsx — Rich Actions

- Melhorar layout: borda esquerda colorida por tipo (em vez de apenas icone colorido)
- **Meeting com link**: Se `metadata.meeting_link` existir, renderizar `<Button size="sm">Entrar na Call</Button>` que abre o link
- **Task**: Renderizar `<Button variant="outline" size="sm">Ver Tarefa</Button>` que navega para `/tasks`
- Manter bolinha de unread + archive button

## 6. Optimistic UI no useNotifications.tsx

O `markAsRead` ja faz update otimista (linhas 89-92). Inverter a ordem para estado primeiro, request depois:

```typescript
// Optimistic: update UI immediately
setNotifications(prev => prev.map(n => ...));
setUnreadCount(prev => Math.max(0, prev - 1));
// Then persist
const { error } = await supabase...
if (error) { /* revert */ }
```

Mesma logica para `archiveNotification`.

## 7. Atualizar interface Notification

Adicionar `entity_type`, `entity_id`, `action_type` opcionais a interface `Notification` no hook.

## Arquivos modificados (5 + migration)
- Migration SQL (novo) — colunas + index + update DB functions
- `supabase/functions/process-notifications/index.ts` — entity fields nos inserts
- `src/hooks/useNotifications.tsx` — interface + optimistic UI
- `src/components/notifications/NotificationCenter.tsx` — abas por tipo
- `src/components/notifications/NotificationItem.tsx` — rich actions + borda colorida

