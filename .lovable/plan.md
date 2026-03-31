

# Fix: Meses Duplicados no Seletor

## Problema
O seletor de mes usa `new Date()` (hoje = 31 de marco) e chama `setMonth(month - i)`. Quando subtrai meses de uma data com dia 31, meses com menos de 31 dias "transbordam" — por exemplo, `setMonth` para fevereiro num dia 31 vira 3 de marco, gerando valores duplicados (ex: "Marco 2026" aparece 2x, "Dezembro 2025" 2x, etc).

## Solucao
Fixar o dia como 1 antes de iterar, eliminando o overflow de dias.

### `src/components/admin/CommandCenter/FloatingActionBar.tsx` (linha 28-29)
Trocar:
```ts
const date = new Date();
date.setMonth(date.getMonth() - i);
```
Por:
```ts
const date = new Date();
date.setDate(1);
date.setMonth(date.getMonth() - i);
```

Apenas 1 linha adicionada. Nenhuma outra mudanca necessaria.

