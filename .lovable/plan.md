

# Fix: Form badge "Pendente" and questions not persisted

## Root cause

1. **Badge always shows "Pendente" on page load**: `FormAccordionItem` determines `isConfigured` from `formData.rules.length`, but `formData` is only loaded lazily on click. The parent has `configuredFormIds` from the DB, but doesn't pass it down.

2. **"Nenhuma pergunta detectada" on every load**: Questions are fetched from Meta API on each click but never persisted. Since Meta forms can't be edited, they should be cached after the first fetch.

## Solution

### 1. Database: Add `form_questions` column to `facebook_lead_integrations`

```sql
ALTER TABLE facebook_lead_integrations 
ADD COLUMN IF NOT EXISTS form_questions jsonb DEFAULT NULL;
```

This stores the detected questions array so they don't need to be re-fetched from Meta.

### 2. `FormAccordionItem` — receive and use `configuredFormIds` prop

- Accept `configuredFormIds: Set<string>` as a prop
- Use it for the badge display instead of relying on lazy-loaded `formData.rules`
- Also pre-load the rules count from the parent query for the subtitle line

### 3. `loadFormData` — cache questions in DB

- On first load: check `integration.form_questions` (from the DB row, passed as prop)
- If cached, use them directly (merge with any lead-based questions)
- If not cached, fetch from Meta API, then save to `facebook_lead_integrations.form_questions`
- This means questions appear immediately on subsequent visits without an API call

### 4. Pass richer data from parent to children

- In `loadIntegrations`, also fetch `form_questions` column
- In the `configuredFormIds` effect, also fetch rule counts per form
- Pass both `configuredFormIds` and `ruleCounts` to each `FormAccordionItem`

### Files to edit
- New migration (add `form_questions` column)
- `src/components/crm/LeadScoringConfig.tsx` (all changes above)

