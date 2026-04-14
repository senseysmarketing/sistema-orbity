

# Fix Auth Loop — Surgical Correction to onAuthStateChange

## Root Cause
Line 144 in `useAuth.tsx`:
```typescript
if (newUserId !== currentUserId || event === 'SIGNED_IN') {
```
The `|| event === 'SIGNED_IN'` condition **defeats the entire dedup mechanism**. Supabase fires `SIGNED_IN` on tab refocus, token refresh fallbacks, and session recovery — all with the same user ID. Each triggers `setSession()` + `setUser()` + profile fetch, causing 1800+ auth requests.

## Fix (single file: `src/hooks/useAuth.tsx`)

### Change 1: Expand `silentEvents` to include `INITIAL_SESSION`
`INITIAL_SESSION` is fired on mount alongside `getSession()` — processing both is redundant.

### Change 2: Remove `|| event === 'SIGNED_IN'` from the guard
Replace the condition with a pure dedup check:
```typescript
if (newUserId !== currentUserId) {
```
When user ID is the same, only update the session ref silently (no state update, no re-render).

### Change 3: Handle same-user SIGNED_IN silently
For `SIGNED_IN` where the user hasn't changed (e.g., tab refocus), update `sessionRef.current` without calling `setSession`/`setUser` — identical to the TOKEN_REFRESHED path.

### Resulting logic flow:
```text
onAuthStateChange(event, session):
  SIGNED_OUT / null session → clear all state, return
  TOKEN_REFRESHED / INITIAL_SESSION → update ref only, return
  newUserId === currentUserId → update session ref only, return  (THIS KILLS THE LOOP)
  newUserId !== currentUserId → full state update + profile fetch (only on actual user change)
```

### Change 4: Remove redundant `getSession()` race
The `getSession().then(...)` block at line 178 races with `onAuthStateChange`. With the listener already handling `SIGNED_IN`, the getSession block only needs to handle the case where the listener hasn't fired yet. Add a guard: if `currentUserIdRef.current` is already set and matches, skip entirely (already implemented but the SIGNED_IN bypass was undoing it).

## Impact
- Auth requests drop from 1800+ to ~2-3 per session (one SIGNED_IN + one getSession)
- Profile fetch: exactly once per login
- Zero re-renders from token refreshes or tab focus events

