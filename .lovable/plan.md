

# Fix: Separate Integration vs Qualification Data

## Root Cause
The migration `20260306190104` incorrectly deleted the row with `form_id = '2159046854900521'` — this was actually the **qualification config** for that form, not a duplicate of the integration config (`form_id = 'all'`).

Additionally, `fetchIntegration` in MetaIntegrationConfig fetches ALL rows and picks one, when it should **only** look at `form_id = 'all'` rows (the integration config).

## Changes

### 1. Restore deleted qualification row
Use the insert tool (not migration) to re-insert the deleted record for `agency_id = '7bef1258-af3d-48cc-b3a7-f79fac29c7c0'` and `form_id = '2159046854900521'`.

### 2. Fix `fetchIntegration` in MetaIntegrationConfig.tsx
Add `.eq('form_id', 'all')` filter so it **only** fetches the catch-all integration row, never picking up qualification-specific rows. This eliminates the entire class of conflict between the two features.

Remove the "prefer form_id=all" workaround logic since the query itself will now be scoped correctly.

### 3. Fix `handleSave` in MetaIntegrationConfig.tsx
When saving, scope the duplicate-prevention delete to `form_id = 'all'` only, so it never accidentally deletes qualification rows.

## Files

| File | Change |
|------|--------|
| `MetaIntegrationConfig.tsx` | Scope `fetchIntegration` and `handleSave` to `form_id = 'all'` only |
| Database (insert tool) | Restore deleted qualification row |

