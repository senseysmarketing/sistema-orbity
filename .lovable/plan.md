

# Fix: Task cards showing "Usuário" instead of real names

## Root Cause

In `src/components/ui/task-card.tsx` line 175, the template reads:
```tsx
{assignment.profiles?.name || 'Usuário'}
```

But after the refactor, `fetchTasks` in `Tasks.tsx` enriches assignments as flat objects:
```ts
{ id: '...', user_id: '...', name: 'Carol', role: 'designer' }
```

The `name` is directly on the object, not nested under `profiles`. So `assignment.profiles?.name` is always `undefined`, falling back to `'Usuário'`.

## Fix

**File: `src/components/ui/task-card.tsx`** (line 175)

Change:
```tsx
{assignment.profiles?.name || 'Usuário'}
```
To:
```tsx
{assignment.name || assignment.profiles?.name || 'Usuário'}
```

This handles both the new flat format from Tasks.tsx and preserves backward compatibility with any other caller that still uses the nested `profiles` shape.

One line change. No other files affected.

