

# Corrigir Margens Duplicadas — NPS e Metas & Bônus

## Problema
O `AppLayout.tsx` já aplica `p-4 md:p-6` no `<main>`. As páginas NPS e Goals adicionam `p-4 md:p-6` nos seus wrappers, causando padding duplicado. Todas as outras páginas usam apenas `space-y-6` sem padding próprio.

## Correção

### `src/pages/NPSPage.tsx`
- Linha 298: `"space-y-6 p-6"` → `"space-y-6"`
- Linha 313: `"space-y-6 p-4 md:p-6"` → `"space-y-6"`

### `src/pages/Goals.tsx`
- Linha 120: `"space-y-6 p-4 md:p-6"` → `"space-y-6"`
- Linha 151: `"space-y-6 p-4 md:p-6"` → `"space-y-6"`

Apenas remoção de classes CSS duplicadas — sem alteração de lógica.

