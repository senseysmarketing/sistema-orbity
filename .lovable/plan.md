
# Fix "Agende uma demonstração" button on Auth page

## Problem
The link points to `#demo` which does nothing on the Auth page. It should open the `ApplicationModal` form.

## Changes in `src/pages/Auth.tsx`

1. **Add state**: `const [applicationOpen, setApplicationOpen] = useState(false);`
2. **Import**: `ApplicationModal` from `@/components/landing/ApplicationModal`
3. **Replace** the `<a href="#demo">` link (line 100) with a `<button>` that calls `setApplicationOpen(true)`
4. **Add** `<ApplicationModal open={applicationOpen} onOpenChange={setApplicationOpen} />` before the closing `</div>` of the main container

One file modified: `src/pages/Auth.tsx`
