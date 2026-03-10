

# Fix: Task Assignment Disappearing After Save

## Root Cause

The realtime listener (line 219) calls `fetchAssignments()` WITHOUT a taskId every time any `task_assignments` row changes. During `assignUsersToTask`, the function does DELETE then INSERT, each triggering the realtime listener which does a FULL state replacement. The DELETE event fires before the INSERT completes, so the full refetch returns data without the new assignment, overwriting the optimistic update.

Timeline:
```text
T0: Optimistic update → Carol visible
T1: DELETE old rows → realtime fires fetchAssignments() → full refetch WITHOUT Carol → Carol gone
T2: INSERT new rows → realtime fires fetchAssignments() → full refetch WITH Carol → Carol back
T3: But T1 and T2 race, causing flicker or permanent loss
```

## Fix

**File:** `src/hooks/useTaskAssignments.tsx`

### 1. Add operation lock to suppress realtime during writes
Add a `useRef` flag (`isOperating`) that is set to `true` during `assignUsersToTask` and `removeUserFromTask`. The realtime listener checks this flag and skips refetching while an operation is in progress.

### 2. Make realtime handler do targeted fetch
Instead of `fetchAssignments()` (full replace), extract the `task_id` from the realtime payload and call `fetchAssignments(taskId)` (merge). This prevents one task's change from wiping all other assignments from state.

### 3. Debounce realtime handler
Since DELETE+INSERT fire in rapid succession, debounce the realtime handler by ~500ms so only the final state is fetched.

### Changes:

```typescript
// Add ref for operation lock
const isOperatingRef = useRef(false);

// In assignUsersToTask:
isOperatingRef.current = true;
// ... do work ...
isOperatingRef.current = false;

// In removeUserFromTask:
isOperatingRef.current = true;
// ... do work ...
isOperatingRef.current = false;

// In realtime handler:
const debounceTimer = useRef<NodeJS.Timeout>();
// ...
(payload) => {
  if (isOperatingRef.current) return; // Skip during active writes
  
  const taskId = payload.new?.task_id || payload.old?.task_id;
  clearTimeout(debounceTimer.current);
  debounceTimer.current = setTimeout(() => {
    fetchAssignments(taskId); // Targeted merge, not full replace
  }, 500);
}
```

### Single file change:
- `src/hooks/useTaskAssignments.tsx`

