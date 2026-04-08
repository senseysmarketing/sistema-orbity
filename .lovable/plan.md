

# Fix: Margens da tela de Contratos

## Problema
Linha 35: `container mx-auto py-6 space-y-6` — mesmo problema que Lembretes tinha.

## Solucao

### `src/pages/Contracts.tsx`
- Linha 35: trocar `className="container mx-auto py-6 space-y-6"` por `className="space-y-4 md:space-y-6"`
- Linha 38: trocar `text-3xl` por `text-2xl md:text-3xl` (padrao global)

