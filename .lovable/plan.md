

# Dual WhatsApp Instance Support (General + Billing)

## Resumo
Permitir duas instancias WhatsApp por agencia (general + billing), com roteamento inteligente, webhook atualizado e UI com toggle para numero exclusivo de cobranca.

## 1. SQL Migration

```sql
-- Add purpose column
ALTER TABLE whatsapp_accounts ADD COLUMN purpose text NOT NULL DEFAULT 'general';

-- Drop existing unique constraint on agency_id (currently 1 account per agency)
ALTER TABLE whatsapp_accounts DROP CONSTRAINT whatsapp_accounts_agency_id_key;

-- New composite unique: 1 account per agency per purpose
CREATE UNIQUE INDEX whatsapp_accounts_agency_purpose_idx ON whatsapp_accounts (agency_id, purpose);

-- Unique instance_name globally (avoid Evolution API conflicts)
CREATE UNIQUE INDEX whatsapp_accounts_instance_name_idx ON whatsapp_accounts (instance_name);

-- Add toggle to agency_payment_settings
ALTER TABLE agency_payment_settings ADD COLUMN use_separate_billing_whatsapp boolean NOT NULL DEFAULT false;
```

## 2. Edge Function: `whatsapp-connect/index.ts`

- Accept optional `purpose` param (default `'general'`) from request body
- Change `generateInstanceName` to: `orbity_{agency8}_{purpose}` (e.g. `orbity_7bef1258_billing`)
- Change upsert `onConflict` from `'agency_id'` to `'agency_id,purpose'`
- Include `purpose` in upsert data
- All actions (status, disconnect, refresh_qr, check_webhook) must accept `purpose` and filter by `agency_id + purpose` instead of just `agency_id`

## 3. Edge Function: `whatsapp-webhook/index.ts`

- The webhook already finds accounts by `instance_name` (line 187-189), which is unique per purpose. No structural change needed -- it already routes correctly since each instance has a unique name.
- After migration, the `instance_name` contains the purpose suffix, so messages are naturally saved under the correct `account_id`.

## 4. Hook: `useWhatsApp.tsx`

- Accept optional `purpose` parameter (default `'general'`)
- Add `.eq('purpose', purpose)` to account query (line 60)
- Pass `purpose` to all edge function calls (connect, disconnect, status, refresh_qr, check_webhook)
- Update query keys to include `purpose` for cache isolation: `['whatsapp-account', agencyId, purpose]`
- `sendMessage` already uses `account.id` which is purpose-specific, no change needed there

## 5. UI: `WhatsAppIntegration.tsx`

- Fetch `use_separate_billing_whatsapp` from `agency_payment_settings`
- Add Switch at top: "Usar numero exclusivo para cobrancas financeiras"
- Toggle upserts `use_separate_billing_whatsapp` on `agency_payment_settings`
- Extract current card into a reusable `WhatsAppInstanceCard` component accepting `purpose` and `title` props
- When OFF: render one card (purpose='general', title="WhatsApp Principal")
- When ON: render two cards side by side:
  - Card 1: purpose='general', title="Atendimento & Automacoes"
  - Card 2: purpose='billing', title="Financeiro & Cobranca"
- Each card uses its own `useWhatsApp(purpose)` instance

## 6. Edge Function: `process-billing-reminders/index.ts`

- After fetching `settings`, check `settings.use_separate_billing_whatsapp`
- If true: query `whatsapp_accounts` with `.eq('purpose', 'billing')` first; if not found/connected, fall back to `'general'`
- If false: query with `.eq('purpose', 'general')` (current behavior, line 100-105)

## 7. WhatsAppChat.tsx (visual indicator)

- No changes needed for MVP. The chat component already uses the `general` purpose hook. Billing messages are sent by the system (edge function), not via the CRM chat. Adding a visual badge for billing-origin messages can be a follow-up enhancement.

## Arquivos alterados
1. SQL migration (new)
2. `supabase/functions/whatsapp-connect/index.ts`
3. `supabase/functions/process-billing-reminders/index.ts`
4. `src/hooks/useWhatsApp.tsx`
5. `src/components/settings/WhatsAppIntegration.tsx`

