

# Fix: WhatsApp Connection Error

## Problem
1. The deployed edge function is still running the **old version** (line 82 tries `.replace()` on `api_url` from request body, which is no longer sent). The new code in the repo is correct but hasn't been deployed.
2. The existing `whatsapp_accounts` record has `instance_name: "Senseys"` (old name). Since you deleted the old instance from Evolution, we need to reset this record to use the new pattern `orbity_7bef1258`.

## Plan

### 1. Reset the whatsapp_accounts record
Run SQL to delete the old record so the connect flow starts fresh:
```sql
DELETE FROM whatsapp_accounts WHERE agency_id = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0';
```

### 2. Force redeploy the edge function
Deploy `whatsapp-connect` to push the new centralized code that's already in the repo.

### 3. Test the flow
After deploy, clicking "Conectar WhatsApp" will:
- Create instance `orbity_7bef1258` on Evolution API
- Configure webhook automatically
- Return QR code for scanning

No code changes needed — the file is already correct, it just needs to be deployed and the old DB record cleared.

