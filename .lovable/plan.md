

# Remover Arquivos de Precos da Landing Page

## Situacao Atual
O `PricingSection` ja foi removido do `LandingPage.tsx` na pivotagem anterior. Porem, os arquivos ainda existem como codigo morto no projeto.

## Acao
Deletar os 2 arquivos orphans:
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/LandingPricingCards.tsx`

Nenhum outro arquivo importa esses componentes, entao a remocao e segura e sem efeitos colaterais.

