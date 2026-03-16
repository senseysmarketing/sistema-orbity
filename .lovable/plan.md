

# Webhook Form Responses: Display + Qualification + Examples

## Current State

1. **LeadDetailsDialog**: Only shows "Respostas do Formulário" when `lead.source === 'facebook_leads'` (line 188). Webhook leads (`source: 'webhook'`) are completely ignored — their custom_fields are never displayed.

2. **LeadScoringConfig**: Only loads forms from `facebook_lead_integrations` table. There's no concept of "webhook forms" — so even though `capture-lead` now saves flat custom_fields and triggers qualification, there are no scoring rules to match against (the `resolveFormId` function won't find anything for webhook leads).

3. **Code Examples**: The current examples only show basic fields (name, email, phone). They don't demonstrate sending custom/form fields that would be used for qualification.

## Plan

### 1. Update LeadDetailsDialog to show webhook form responses
- Remove the `isMetaAdsLead` gate — show form responses for ANY lead that has custom_fields with qualifying questions
- Change badge dynamically: "Meta Ads" for facebook_leads source, "Webhook" for webhook source, "Formulário" for others
- Filter out internal fields (`webhook_source`, `received_at`, `form_id`, etc.) same way we filter Meta technical fields

### 2. Add Webhook Form support to LeadScoringConfig
- After loading Meta integrations, also scan `leads` table for distinct webhook custom_field keys (leads where `source = 'webhook'` or `custom_fields->>'webhook_source' = 'true'`)
- Create a virtual "Webhook" integration entry with a synthetic form_id (e.g., `webhook_default`) that aggregates detected questions and answers from webhook leads
- This allows users to configure scoring rules for webhook questions the same way they do for Meta forms
- The `resolveFormId` fallback (step 3 — `inferFormId`) already matches by question overlap, so webhook leads will automatically find their rules

### 3. Update capture-lead to set a form_id for webhook leads
- Add `form_id: 'webhook_default'` (or a configurable value from the webhook config) to `custom_fields` so the qualification engine can directly resolve it

### 4. Improve code examples in WebhooksManager
- Show a complete example with custom fields (form questions) alongside standard fields
- Add comments explaining which fields are standard vs custom (used for qualification)
- Include a realistic example with form-style questions like the user's screenshot

### 5. Fix NodeJS namespace build errors
- Add `/// <reference types="node" />` or replace `NodeJS.Timeout` with `ReturnType<typeof setTimeout>` in the 3 affected files

### Files Modified
- `src/components/crm/LeadDetailsDialog.tsx` — Show form responses for all sources
- `src/components/crm/LeadScoringConfig.tsx` — Add webhook form detection
- `src/components/crm/WebhooksManager.tsx` — Complete code examples with custom fields
- `supabase/functions/capture-lead/index.ts` — Add `form_id` to custom_fields
- `src/components/agenda/MeetingNotesTab.tsx` — Fix NodeJS type
- `src/hooks/useFormDraft.tsx` — Fix NodeJS type
- `src/hooks/useSubscription.tsx` — Fix NodeJS type

