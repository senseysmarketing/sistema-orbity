

# Fix: Evolution API Webhook Configuration

## Root Cause
From the [Evolution API GitHub issue #1657](https://github.com/EvolutionAPI/evolution-api/issues/1657), the exact same error `"instance requires property \"webhook\""` occurs when using wrong property names inside the webhook object. The Evolution API v2.2+ uses **`byEvents`** and **`base64`** (not `webhookByEvents` / `webhookBase64`). The strict validation rejects unknown properties, causing the entire `webhook` object to fail validation.

## Fix

**File:** `supabase/functions/whatsapp-connect/index.ts`

Change the `configureWebhook` function payload from:
```json
{ "webhook": { "webhookByEvents": false, "webhookBase64": false, ... } }
```
To:
```json
{ "webhook": { "enabled": true, "url": "...", "byEvents": false, "base64": false, "events": [...] } }
```

Also add detailed logging of the URL and payload being sent for easier future debugging.

## Changes Summary
- Fix property names: `webhookByEvents` → `byEvents`, `webhookBase64` → `base64`
- Add logging of endpoint URL and payload before the request
- Single file change: `supabase/functions/whatsapp-connect/index.ts`

