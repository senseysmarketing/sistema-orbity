

# Fix WhatsApp: Reply Detection, Ghost Messages & Chat Sync

## Root Cause Analysis

I found **3 critical bugs** by inspecting logs and database:

### Bug 1: `messages.update` events create 713+ ghost messages
Evolution API v2 sends `messages.update` as a **status update** (READ, DELIVERY_ACK, SERVER_ACK) with `data` as an **array**, not an object. The current code does `data?.key` which returns `undefined` on an array, so:
- `isFromMe` defaults to `false` (looks like customer message)
- `phoneNumber` becomes `""` (empty)
- A ghost conversation (`77e1005b`) was created with 713 fake "incoming" messages
- `last_customer_message_at` gets set on this ghost conversation, corrupting state

### Bug 2: `find_lead_by_normalized_phone` RPC doesn't exist
The webhook calls this RPC to link conversations to leads, but the function was never created in the database. It fails silently, so **incoming messages never get linked to leads** — meaning the reply detection (`findActiveAutomations` lead_id fallback) never works.

### Bug 3: `@lid` Meta Messenger IDs not filtered
Numbers like `117012189720787` and `37705652138094@lid` are Meta Messenger lead IDs, not WhatsApp numbers. They create junk conversations.

### Result
Follow-ups fire on leads that already replied because:
1. Real customer replies create orphan conversations (no `lead_id` due to missing RPC)
2. The automation's `conversation_id` points to a different conversation than the reply
3. The `lead_id` fallback in both webhook and queue processor fails (no RPC = no lead link)

## Fix Plan

### 1. Fix `whatsapp-webhook/index.ts`
- **Handle `messages.update` correctly**: Parse as array, only update existing message status (READ/DELIVERED), don't create conversations or trigger reply detection
- **Skip `@lid` remoteJid**: Filter Meta Messenger IDs
- **Inline lead phone lookup**: Replace the missing `find_lead_by_normalized_phone` RPC with a direct query using `regexp_replace` on the DB side (or create the RPC)

### 2. Create `find_lead_by_normalized_phone` RPC (SQL migration)
```sql
CREATE OR REPLACE FUNCTION find_lead_by_normalized_phone(p_agency_id uuid, p_phone_digits text)
RETURNS TABLE(id uuid, name text, phone text) AS $$
  SELECT id, name, phone FROM leads
  WHERE agency_id = p_agency_id
    AND regexp_replace(phone, '\D', '', 'g') = p_phone_digits
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 3. Clean up ghost data
- Delete the 713 ghost messages on conversation `77e1005b`
- Delete the ghost conversation itself

### 4. Fix `process-whatsapp-queue/index.ts`
- Add additional lead-phone fallback when the conversation's `last_customer_message_at` is null but other conversations with same normalized phone have replies

### Files Modified
- `supabase/functions/whatsapp-webhook/index.ts` — Handle messages.update array format, skip @lid, fix lead linking
- `supabase/functions/process-whatsapp-queue/index.ts` — Improve reply detection fallback
- SQL migration — Create `find_lead_by_normalized_phone` RPC + cleanup ghost data

