

# Fix Client Badge in Task Card

## Problems
1. **White text on white/light badge** — the `clientColor` function returns a color, but for internal tasks (`is_internal`) the `clientId` is null, so `getClientColor` returns `hsl(var(--muted))` which is light/white, and text is also white.
2. **Badge too large** — long client names push the badge to wrap or overlap the date.
3. **Too close to the date** — needs spacing between date and client badge.

## Changes — `src/components/ui/task-card.tsx`

### 1. Truncate client name
Limit displayed text to ~12 characters with ellipsis using `truncate` and `max-w-[120px]`.

### 2. Add gap between date and badge
Add `gap-3` to the flex container instead of relying solely on `ml-auto`.

### 3. Fix color for internal tasks
Pass `task` to `getClientColor` or use a distinct color when `is_internal` is true. The simplest fix: check `is_internal` in the component and assign a specific color (e.g., a purple/indigo) instead of the muted fallback.

