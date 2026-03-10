

# Fix: WhatsApp Webhook Resilience

## Changes to `supabase/functions/whatsapp-webhook/index.ts`

### 1. Empty body guard (before signature validation)
Add check right after `req.text()` — before HMAC or JSON parsing:
```typescript
if (!bodyText || bodyText.trim() === '') {
  console.log('[whatsapp-webhook] Empty body received');
  return new Response('ok', { status: 200 });
}
```

### 2. Safe JSON parsing with try/catch
Replace the raw `JSON.parse(bodyText)` (line 66) with a try/catch that returns 200 on non-JSON payloads.

### 3. Early return on missing event
After parsing, check `if (!event)` and return 200 (handles Evolution pings).

### 4. Event logging
Add `console.log('[whatsapp-webhook] Event:', event, 'Instance:', instance)` after validation passes.

### 5. Anti-duplication
Already handled — the existing code uses `upsert` with `onConflict: 'account_id,message_id'` on `whatsapp_messages`, so duplicate webhook deliveries are safely ignored at the DB level.

### File changed
- `supabase/functions/whatsapp-webhook/index.ts` — restructure lines 58-80 (the body parsing section)

