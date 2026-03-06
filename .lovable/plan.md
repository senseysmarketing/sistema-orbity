

# Fix: Pixel Redundancy, Auto-Discovery, and Dialog Pre-fill

## Problems Identified

1. **Pixel ID is duplicated** — manual input exists in both the "Editar Configuração" dialog (MetaIntegrationConfig) AND inside each form accordion in the Qualificação tab (LeadScoringConfig). Redundant and confusing.

2. **Pixel is manual** — both places use a text `<Input>` for Pixel ID. Should use auto-discovery from the new `facebook_pixels` table via the Meta API.

3. **Dialog doesn't pre-fill correctly** — when opening "Editar Configuração" with an existing integration, it calls `fetchPages()` async but immediately tries to set `selectedPage` before pages are loaded. The page select shows empty, and forms aren't fetched for the pre-selected page.

## Solution

### 1. Remove Pixel ID from LeadScoringConfig (Qualificação tab)

Remove the manual Pixel ID input + save button from `FormAccordionItem`. Pixel configuration belongs in Integrações, not per-form qualification. Remove `pixelId` from `FormData`, `savePixelId` function, and the UI block (lines 760-775).

### 2. Replace manual Pixel ID in MetaIntegrationConfig with auto-discovery selector

In the "Configurar Meta" dialog:
- Remove the manual `<Input>` for Pixel ID
- Add a "Pixel de Conversão" section with:
  - A `<Select>` dropdown populated from `facebook_pixels` table
  - A "Buscar Pixels" button that calls the `facebook-accounts` edge function with a new `list_pixels` action to discover pixels from the selected ad account
  - Optional `test_event_code` input for debugging
- On save, update `facebook_pixels.is_selected` for the chosen pixel

### 3. Add `list_pixels` action to `facebook-accounts` edge function

New action that:
1. Gets `access_token` from `facebook_connections`
2. For the selected ad account, calls `GET /{ad_account_id}/adspixels?fields=id,name`
3. Upserts results into `facebook_pixels` table
4. Returns the list

### 4. Fix dialog pre-fill when editing

Current bug: `handleOpenDialog` calls `fetchPages()` (async) then immediately sets `selectedPage` — but pages aren't loaded yet so the Select shows empty, and forms aren't fetched.

Fix: After `fetchPages()` resolves, if editing an existing integration:
1. Set `selectedPage` to `currentIntegration.page_id`
2. Find the matching page in the loaded list to get `pageAccessToken`
3. Call `fetchForms(pageId, pageToken)` to load forms
4. Then set `selectedForm` to `currentIntegration.form_id`

## Files to Edit

| File | Change |
|------|--------|
| `src/components/crm/MetaIntegrationConfig.tsx` | Replace manual Pixel input with auto-discovery selector; fix dialog pre-fill; add pixel fetch + select logic |
| `src/components/crm/LeadScoringConfig.tsx` | Remove Pixel ID input/save from FormAccordionItem |
| `supabase/functions/facebook-accounts/index.ts` | Add `list_pixels` action |

## UX After Fix

```text
CRM → Configurações → Integrações → Meta → Editar Configuração
  → Conta de Anúncios: [Select - pre-filled]
  → Página: [Select - pre-filled correctly]
  → Formulário: [Select - pre-filled correctly]
  → Pixel de Conversão: [Select from discovered pixels + "Buscar Pixels" button]
  → Test Event Code: [optional input]
  → Salvar

CRM → Configurações → Qualificação
  → (NO pixel field here anymore - clean, only scoring rules)
```

