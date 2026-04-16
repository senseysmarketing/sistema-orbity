

# Escudo Anti-Bot: confirmação de schema e implementação

## Verificação do schema (executada)

Consultei `information_schema.columns` para `whatsapp_messages`. Coluna real:

```
is_from_me  boolean  ✅
```

A coluna **é `is_from_me`** (não `from_me`). O plano original estava correto. O resto do código já usa `is_from_me` (ex.: linha do upsert da mensagem recebida no webhook e o componente `WhatsAppChat.tsx` que filtra `msg.is_from_me`).

Portanto: **mantemos `.eq('is_from_me', true)`** — é o nome exato da coluna no banco.

## Confirmação do fluxo de gravação

A gravação da mensagem recebida acontece **antes** do bloco do Escudo Anti-Bot, via `supabase.from('whatsapp_messages').upsert(...)` com `is_from_me: false`. O escudo apenas envolve `Promise.all([pauseAutomations, promoteLeadOnReply])`.

Resultado garantido para mensagens de bot:
- ✅ Mensagem persistida em `whatsapp_messages` (vendedor vê no `WhatsAppChat.tsx`)
- ✅ `last_customer_message_at` atualizado na conversation
- ❌ Automações **não** são pausadas
- ❌ Lead **não** é promovido no Kanban

## Implementação

Em `supabase/functions/whatsapp-webhook/index.ts`, dentro do bloco `if (!isFromMe)`, **após** o upsert da mensagem recebida e **antes** do `Promise.all`:

```ts
// Anti-Bot Shield: detect auto-replies (< 10s after our last sent message)
const AUTO_REPLY_THRESHOLD_SEC = 10;
let isAutoReply = false;

try {
  const { data: lastSent } = await supabase
    .from('whatsapp_messages')
    .select('created_at')
    .eq('conversation_id', conversation.id)
    .eq('is_from_me', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSent?.created_at) {
    const diffSec = (Date.now() - new Date(lastSent.created_at).getTime()) / 1000;
    if (diffSec < AUTO_REPLY_THRESHOLD_SEC) {
      isAutoReply = true;
      console.log(`[Anti-Bot Shield] Auto-reply detected. Delta: ${diffSec.toFixed(2)}s — skipping pause + CRM Vivo`);
    }
  }
} catch (e) {
  console.error('[Anti-Bot Shield] check failed, treating as human (fail-open):', e);
}

if (!isAutoReply) {
  await Promise.all([
    pauseAutomations,
    shouldPromote
      ? promoteLeadOnReply(supabase, account.agency_id, conversation.lead_id)
      : Promise.resolve(),
  ]);
}
```

## Guardrails finais

| # | Garantia | Como |
|---|----------|------|
| 1 | Nome da coluna correto | `is_from_me` confirmado via schema |
| 2 | Mensagem do bot visível | Upsert ocorre antes do escudo, fora do bloco condicional |
| 3 | Sem retrocesso | Apenas pausa + promoção são puladas; gravação intacta |
| 4 | Fail-open | Try/catch trata escudo como humano se query falhar |
| 5 | Performance | 1 query indexada (~5-15ms) antes do Promise.all |
| 6 | Threshold configurável | Constante `AUTO_REPLY_THRESHOLD_SEC = 10` |
| 7 | Auditoria | Log `[Anti-Bot Shield]` com delta exato |

## Ficheiro alterado
- `supabase/functions/whatsapp-webhook/index.ts` (~20 linhas no bloco `!isFromMe`)

Sem migration. Sem schema change.

