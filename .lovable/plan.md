

# Add Agency as Virtual Client in Dropdowns

## Approach

Inject the agency itself as a "virtual" option at the top of every client selector, using a special ID convention (`agency:{agencyId}`). This way:

- It appears in dropdowns for task/meeting/post assignment
- It is **never** stored in the `clients` table, so it won't affect metrics (ticket medio, client count, financial reports, etc.)
- When saved, tasks/meetings store this special ID which can be resolved back to the agency name for display

## Implementation

### 1. Create a shared utility for the virtual agency client

A small helper in `src/lib/virtualAgencyClient.ts` that:
- Defines the prefix convention: `agency:` + agency ID
- Provides `getVirtualAgencyClient(agency)` returning `{ id: "agency:{id}", name: agencyName }` with a label like "Senseys (Interno)" or just the agency name with a building icon
- Provides `isVirtualAgencyClient(id)` to check if an ID is the virtual agency
- Provides `resolveClientName(id, clients, agencyName)` for display

### 2. Inject into `MultiClientSelector` consumers

In the places that fetch clients and pass them to `MultiClientSelector` (Tasks.tsx, MeetingFormDialog.tsx), prepend the virtual agency entry to the clients array before passing it. This keeps `MultiClientSelector` itself generic.

Key files:
- **`src/pages/Tasks.tsx`** — after `fetchClients`, prepend virtual agency
- **`src/components/agenda/MeetingFormDialog.tsx`** — same pattern with `useClientRelations`

### 3. Handle display in task cards and details

Update task card rendering and details dialog to resolve the `agency:` prefix back to the agency name (with a visual indicator like a building icon or "(Interno)" suffix) so it's clear it's an internal task.

### 4. Handle DB storage

The `client_id` column and `task_clients` junction table will store `agency:{id}` as a string. Since these are UUID columns referencing clients, we need a different approach: use a **sentinel value**. We'll store `client_id = NULL` and add a boolean `is_internal` flag, OR we can store the agency ID directly and skip the FK constraint.

**Simpler approach**: Add the virtual entry only in the UI layer. When `agency:{id}` is selected, store `client_id = null` and set a metadata field `is_internal: true` on the task. This avoids any FK issues.

Actually, the simplest approach that avoids schema changes: use `task_clients` junction table which likely doesn't have an FK to clients. Let me verify.

**Revised simplest approach**: Just prepend the agency as a visual-only option in dropdowns. When selected, don't link to any client — just tag the task with `is_internal = true` in the existing `metadata` JSONB field. Display-wise, show the agency name wherever client name would appear.

## Files to Change

| File | Change |
|------|--------|
| `src/lib/virtualAgencyClient.ts` (new) | Helper functions for virtual agency client |
| `src/pages/Tasks.tsx` | Prepend virtual agency to clients list; handle selection to set metadata.is_internal |
| `src/components/agenda/MeetingFormDialog.tsx` | Prepend virtual agency to clients list |
| `src/components/clients/MultiClientSelector.tsx` | Add visual differentiation (building icon) for agency entries |
| `src/components/ui/task-card.tsx` | Show agency name for internal tasks |

