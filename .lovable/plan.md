

# Fix: Dialog Pre-fill Loading Wrong Integration Data

## Root Cause

There are **two duplicate rows** in `facebook_lead_integrations`:

| form_id | form_name | default_status | 
|---------|-----------|----------------|
| `all` | Todos os formulários | `leads` |
| `2159046854900521` | [Senseys] 2026 V6 | `new` |

`fetchIntegration` picks the **most recent** row (the specific form one with `default_status: "new"`), which causes:

1. **Form shows "[Senseys] 2026 V6"** instead of "Todos Formulários" — wrong row selected
2. **Status is blank** — `"new"` doesn't match any `<SelectItem>` value (`leads`, `qualified`, `scheduled`)

## Fix

### 1. Clean up duplicate integration row (migration)
Delete the stale specific-form row that shouldn't exist, keeping only the `form_id = 'all'` one.

### 2. Fix `fetchIntegration` to be resilient
Remove the `is_active` filter (it might miss valid rows) and just get the latest for the agency. Also, if there are multiple rows, prefer the one with `form_id = 'all'` since that's the "catch-all" config.

### 3. Add `"new"` as a valid status option in the Select
The status `"new"` is a legitimate CRM status. Add it as `<SelectItem value="new">Novo</SelectItem>`. Also add a placeholder so blank values are visible.

### 4. Defensive default in `handleOpenDialog`
If `currentIntegration.default_status` doesn't match known values, fall back to `"leads"`.

## Files

| File | Change |
|------|--------|
| Migration (new) | Delete duplicate row with `form_id != 'all'` for this agency |
| `MetaIntegrationConfig.tsx` | Add "Novo" status option; make `fetchIntegration` prefer `form_id='all'`; add fallback for unknown status |

