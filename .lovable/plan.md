

# Plan: Fetch Form Questions from Meta Graph API

## Problem

Currently, `detectedQuestions` are built by scanning `custom_fields` from existing leads in the database. If a form was just imported and no leads have arrived yet, there are no leads to scan → "Nenhuma pergunta detectada."

## Solution

Add a new action `list_form_questions` to the `facebook-leads` edge function that calls the Meta Graph API endpoint:

```
GET /{form_id}?fields=questions&access_token={page_token}
```

This returns the form's structure with all questions and their predefined options (for multiple choice) directly from Meta, without needing any existing leads.

### 1. Edge Function — new action `list_form_questions`

In `supabase/functions/facebook-leads/index.ts`:

- Add a new handler for `action: "list_form_questions"`
- Takes `agencyId`, `pageId`, `formId`
- Uses same connection lookup pattern (agency_id → /me/accounts → page_token)
- Calls `GET /{form_id}?fields=questions&access_token={pageToken}`
- Returns questions with their `key`, `label`, `type`, and `options` (predefined answers)

Meta returns:
```json
{
  "questions": [
    {
      "key": "qual_o_seu_interesse",
      "label": "Qual o seu interesse?",
      "type": "CUSTOM",
      "options": [
        { "key": "casa", "value": "Casa" },
        { "key": "terreno", "value": "Terreno" }
      ]
    }
  ]
}
```

### 2. Frontend — `loadFormData` in `LeadScoringConfig.tsx`

Update `loadFormData` to:

1. Keep existing logic (scan leads' `custom_fields` for detected questions)
2. **Additionally** call the new `list_form_questions` action to fetch questions directly from Meta
3. **Merge** both sources: Meta questions provide the base structure (all possible answers), lead-based detection adds any extra answers seen in practice
4. Filter out technical/PII fields from Meta questions using existing `TECHNICAL_FIELDS` set

This ensures questions appear immediately after import, even with zero leads.

### Files to edit
- `supabase/functions/facebook-leads/index.ts` — add `list_form_questions` action
- `src/components/crm/LeadScoringConfig.tsx` — call new action in `loadFormData` and merge results

