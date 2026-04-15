

# Adicionar SVG constellation pattern ao fundo das secções

O HeroSection já usa um padrão SVG "constellation" (pontos + linhas) com `opacity-[0.05]` para dar textura ao gradiente roxo. As secções DifferentialsSection e PricingSection (card spotlight) usam o mesmo gradiente mas sem este padrão — ficam "lisas".

## Alterações

### 1. `src/components/landing/DifferentialsSection.tsx`
- Adicionar `relative overflow-hidden` à `<section>`
- Inserir o mesmo SVG constellation pattern do Hero (com um `id` diferente no pattern, ex: `constellation-diff`, para evitar conflito de IDs no DOM)
- Opacidade: `opacity-[0.05]`
- Adicionar `relative z-10` ao container interno para o conteúdo ficar acima do SVG

### 2. `src/components/landing/PricingSection.tsx`
- Dentro do Spotlight Card (já tem `relative overflow-hidden`), adicionar o SVG constellation com `id` único (ex: `constellation-pricing`)
- Opacidade: `opacity-[0.05]`
- O conteúdo já está naturalmente acima por stacking order

Ambos reutilizam o padrão exato do HeroSection — pontos brancos com linhas conectoras — apenas com IDs únicos.

