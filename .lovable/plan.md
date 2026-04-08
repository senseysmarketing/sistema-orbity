

# Fix: Tamanho do botao "Novo Contrato"

## Problema
O botao "Novo Contrato" usa `size="lg"` (linha 48), enquanto os botoes equivalentes nas outras telas usam o tamanho padrao (`default`).

## Solucao

### `src/pages/Contracts.tsx`
- Linha 48: remover `size="lg"` do `<Button>`, deixando o tamanho padrao

