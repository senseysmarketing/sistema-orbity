

# Padronizar Tamanho dos Botoes no Command Center

## Problema
Os botoes "Este Mes", "Prox. 7 dias", "Atrasados", "Analise Avancada" e "Gerenciar Equipe" estao menores que "Gerenciar Carteira" porque possuem classes extras `h-7 text-xs` ou `h-8 text-xs` que reduzem sua altura e fonte.

## Solucao
Remover as classes `h-7 text-xs` e `h-8 text-xs` desses botoes, deixando todos com o tamanho padrao do `size="sm"` (h-9, text-sm) — igual ao "Gerenciar Carteira".

## Arquivos

### `src/components/admin/CommandCenter/CashFlowTable.tsx` (linhas 94-111)
- Remover `className="h-7 text-xs"` dos 4 botoes de filtro e analise avancada

### `src/components/admin/CommandCenter/TeamSection.tsx` (linha 41)
- Remover `className="h-8 text-xs"` do botao "Gerenciar Equipe"
- Ajustar icone de `h-3.5 w-3.5` para `h-4 w-4` para manter proporcao

