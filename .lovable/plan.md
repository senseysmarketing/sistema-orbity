

# Adicionar textura de constelação e alinhar larguras dos cards

## Alterações

### 1. `src/pages/LandingPage.tsx`
- Adicionar o mesmo SVG de constelação (constellation pattern) da HeroSection ao wrapper `div` que envolve FeaturesGrid + AIFeaturesSection
- Wrapper precisa de `relative overflow-hidden` para conter o SVG absolute

### 2. `src/components/landing/FeaturesGrid.tsx`
- Alterar `max-w-6xl` para `max-w-5xl` na grid, igualando ao `max-w-5xl` da AIFeaturesSection

### Detalhe técnico
O SVG é copiado exatamente da HeroSection (linhas 19-38), com o mesmo pattern de pontos + linhas a `opacity-[0.05]`, posicionado `absolute inset-0`. O conteúdo dos componentes filhos mantém `relative z-10` implícito via `container`.

