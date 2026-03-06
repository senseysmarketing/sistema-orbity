
# Plan: Move 122 "Desqualificados" leads to "Perdido" (lost)

## What

Run a single SQL migration to update all 122 leads currently with status `Desqualificados` or `desqualificados` to:
- `status = 'lost'`
- `loss_reason = 'outro: Lead Antigo'`
- `updated_at = now()`

## How

Create a migration file with:

```sql
UPDATE leads
SET status = 'lost',
    loss_reason = 'outro: Lead Antigo',
    updated_at = now()
WHERE status IN ('Desqualificados', 'desqualificados');
```

Single file: new migration `supabase/migrations/move_desqualificados_to_lost.sql`

No frontend changes needed — the Kanban already renders `lost` as "Perdido".
