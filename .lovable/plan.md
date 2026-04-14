

# Cross-Instance Automation Pausing + Lead Resolution

## Resumo
Refatorar `findActiveAutomations` para buscar por `agency_id` (cross-instance) e garantir que o lead seja resolvido globalmente antes de tentar pausar automações.

## Alterações em `supabase/functions/whatsapp-webhook/index.ts`

### 1. Refatorar `findActiveAutomations` (linhas 98-118)

Mudar assinatura de `(supabase, accountId, conversationId, leadId)` para `(supabase, agencyId, conversationId, leadId)`.

- **Busca por conversationId**: manter filtro por `conversation_id` (sem filtro de `account_id` — conversas são únicas por ID)
- **Busca por leadId (cross-instance)**: remover `.eq('account_id', ...)` e buscar automações ativas por `lead_id` em QUALQUER conta da agência, usando um join ou subquery:
  - Buscar todos os `account_id`s da agência: `SELECT id FROM whatsapp_accounts WHERE agency_id = agencyId`
  - Filtrar automações `.in('account_id', agencyAccountIds).eq('lead_id', leadId).in('status', ['active', 'processing'])`

### 2. Resolução global do Lead (antes da conversa — linhas 318-381)

O código atual já faz `find_lead_by_normalized_phone` com `agency_id` quando não encontra conversa (linha 330). Porém, quando **encontra** a conversa mas ela não tem `lead_id`, ele já resolve o lead (linha 370).

**Ajuste necessário**: Mesmo quando a conversa É encontrada COM `lead_id`, precisamos garantir que o `lead_id` esteja disponível. O código atual já faz isso (linha 326 prioriza conversas com `lead_id`).

**Ajuste adicional para billing**: Quando a mensagem chega no número de billing e NÃO existe conversa nessa instância, o código já busca o lead globalmente via RPC (linha 330). O lead é encontrado, mas a conversa é criada na instância de billing. O `lead_id` fica disponível para `findActiveAutomations`. **Isso já funciona.**

O ponto crítico é apenas garantir que, se o lead não foi encontrado via conversa, façamos a busca RPC **antes** de chamar `findActiveAutomations`. O código atual já faz isso. Nenhuma mudança estrutural no fluxo de resolução de lead é necessária.

### 3. Atualizar chamadas a `findActiveAutomations` (linhas 419 e 445)

Trocar `account.id` por `account.agency_id` nas duas chamadas:

```typescript
// Linha 419 (customer reply)
const automations = await findActiveAutomations(
  supabase, account.agency_id, conversation.id, conversation.lead_id
);

// Linha 445 (operator takeover)
const automations = await findActiveAutomations(
  supabase, account.agency_id, conversation.id, conversation.lead_id
);
```

### Implementação da nova `findActiveAutomations`

```typescript
async function findActiveAutomations(
  supabase: any, agencyId: string, conversationId: string, leadId: string | null
): Promise<{ id: string }[]> {
  // 1. By conversation (scoped, fast)
  const { data: byConv } = await supabase
    .from('whatsapp_automation_control').select('id')
    .eq('conversation_id', conversationId)
    .in('status', ['active', 'processing']).limit(10);

  if (byConv && byConv.length > 0) return byConv;
  if (!leadId) return [];

  // 2. By lead across ALL accounts in the agency (cross-instance)
  const { data: agencyAccounts } = await supabase
    .from('whatsapp_accounts').select('id')
    .eq('agency_id', agencyId);

  if (!agencyAccounts || agencyAccounts.length === 0) return [];

  const accountIds = agencyAccounts.map((a: any) => a.id);

  const { data: byLead } = await supabase
    .from('whatsapp_automation_control').select('id')
    .in('account_id', accountIds)
    .eq('lead_id', leadId)
    .in('status', ['active', 'processing']).limit(10);

  return byLead || [];
}
```

## Arquivo alterado
1. `supabase/functions/whatsapp-webhook/index.ts`

