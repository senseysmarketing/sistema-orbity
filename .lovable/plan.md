

# Auditoria de Performance — Plano de Implementacao Completo

## Resumo
Refatorar hooks duplicados em Context Providers, corrigir loops de `check-subscription` e `profiles`, e substituir polling do WhatsApp por Realtime com invalidacao via React Query.

## Ordem de execucao

### 1. NotificationProvider — Eliminar 3 canais WebSocket duplicados
- Refatorar `src/hooks/useNotifications.tsx` para exportar `NotificationProvider` + Context
- O Provider cria um unico `supabase.channel` e um unico `fetchNotifications`
- `useNotifications()` passa a consumir o Context (throw se fora do Provider)
- Em `AppLayout.tsx`, envolver o conteudo com `<NotificationProvider>`
- Componentes `NotificationBell`, `NotificationCenter`, `NotificationItem` continuam usando `useNotifications()` sem alteracao

### 2. ReminderListsProvider — Eliminar 2 canais duplicados
- Refatorar `src/hooks/useReminderLists.tsx` para exportar `ReminderListsProvider` + Context
- Provider com canal unico `reminder_lists_changes` e cleanup no unmount
- Em `src/pages/Reminders.tsx`, envolver o conteudo da pagina com `<ReminderListsProvider>`
- `CreateListDialog` e `ReminderFormDialog` consomem do Context

### 3. PushNotificationProvider — Eliminar inicializacoes Firebase duplicadas
- Refatorar `src/hooks/usePushNotifications.tsx` para exportar `PushNotificationProvider` + Context
- Firebase init, SW register e token loading acontecem uma unica vez
- Em `AppLayout.tsx`, envolver com `<PushNotificationProvider>`
- `PushActivationBanner`, `NotificationPreferences`, `NotificationPreferencesPage` consomem do Context

### 4. Corrigir loop de check-subscription (CRITICO)
- Em `src/hooks/useSubscription.tsx`:
  - Remover o `setInterval` de 5 minutos (linhas 339-344) — nao ha necessidade de polling periodico
  - Remover o `useEffect` de `currentAgency` (linhas 354-358) que chama `checkSubscription()` novamente — o cache ja cobre isso
  - Aumentar o TTL do cache de subscription para `Infinity` (ou 30 min) em vez de 5 min, garantindo que `check-subscription` seja chamada apenas 1x por sessao
  - O usuario pode forcar refresh manualmente via `refreshPlans()`

### 5. Corrigir loop de profiles (CRITICO)
- Em `src/hooks/useAuth.tsx`:
  - O profile ja e buscado 2x no mount: uma vez no `onAuthStateChange` SIGNED_IN e outra no `getSession().then()`
  - Adicionar guard: se `currentUserIdRef.current === newUserId` no bloco de `getSession`, pular o fetch de profile (ja feito pelo listener)
  - Isso elimina a query duplicada de `profiles` no mesmo segundo

### 6. WhatsApp — Substituir polling por Realtime
- Em `src/hooks/useWhatsApp.tsx`, no `useConversationMessages`:
  - Remover `refetchInterval: 5000`
  - Adicionar `staleTime: 30_000` para evitar re-fetches desnecessarios
  - Criar um hook interno `useWhatsAppRealtime(conversationId)` que:
    - Abre `supabase.channel('whatsapp-messages-' + conversationId)` filtrando por `conversation_id`
    - No callback do evento, executa `queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', conversationId] })`
    - Retorna cleanup: `supabase.removeChannel(channel)`
  - O React Query cuida do fetch e deduplicacao

## Arquivos alterados
1. `src/hooks/useNotifications.tsx` — Provider + Context
2. `src/components/layout/AppLayout.tsx` — Adicionar NotificationProvider e PushNotificationProvider
3. `src/hooks/useReminderLists.tsx` — Provider + Context
4. `src/pages/Reminders.tsx` — Envolver com ReminderListsProvider
5. `src/hooks/usePushNotifications.tsx` — Provider + Context
6. `src/hooks/useSubscription.tsx` — Remover polling, cache Infinity
7. `src/hooks/useAuth.tsx` — Eliminar fetch duplicado de profile
8. `src/hooks/useWhatsApp.tsx` — Realtime em vez de polling

## Impacto esperado
- WebSocket channels: ~8 para ~3
- `check-subscription` edge function: chamada 1x por sessao em vez de loop continuo
- `profiles` query: 1x no login em vez de 2-3x simultaneas
- WhatsApp polling: 0 requests quando idle (Realtime push-based)

