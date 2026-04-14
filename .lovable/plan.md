

# Criar Header/Navbar para a Landing Page

## Resumo

Criar um componente de navegacao superior sticky com glassmorphism, links de ancoragem, botoes de login/trial, e menu hamburger responsivo usando Sheet do shadcn.

## Prerequisitos

Algumas secoes da landing page nao possuem `id` para ancoragem. Sera necessario adicionar `id` nas secoes: `FeaturesGrid` (`#features`), `FAQSection` (`#faq`). A `PricingSection` ja tem `id="pricing"`.

## Alteracoes

### 1. Criar `src/components/landing/LandingHeader.tsx`

Componente novo com:

- **Sticky header**: `fixed top-0 w-full z-50` com `bg-background/80 backdrop-blur-md border-b border-border/50`
- **Desktop (md+)**:
  - Esquerda: Logo "Orbity" clicavel (scroll to top)
  - Centro: Links "Funcionalidades", "Precos", "FAQ" com `href="#features"`, `#pricing`, `#faq` e `scroll-behavior: smooth`
  - Direita: Botao "Entrar" (variant ghost, navega para `/auth`) + Botao "Teste Gratis" (variant default/solid, navega para `/onboarding?flow=trial`)
- **Mobile (< md)**:
  - Logo esquerda + icone Menu (hamburger) direita
  - Ao clicar, abre `Sheet` do shadcn com links e botoes empilhados verticalmente

### 2. Editar `src/pages/LandingPage.tsx`

- Importar e renderizar `<LandingHeader />` antes do `<HeroSection />`

### 3. Editar `src/components/landing/HeroSection.tsx`

- Adicionar `pt-20` ou `mt-20` para compensar o header fixo (atualmente `py-24 md:py-36`, mudar para `pt-32 md:pt-44 pb-24 md:pb-36`)

### 4. Adicionar `id` nas secoes

- `FeaturesGrid.tsx`: adicionar `id="features"` na `<section>`
- `FAQSection.tsx`: adicionar `id="faq"` na `<section>`

### 5. Scroll suave global

- Adicionar `scroll-behavior: smooth` no `html` via `index.css` (se nao existir)

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/landing/LandingHeader.tsx` | Novo componente |
| `src/pages/LandingPage.tsx` | Importar LandingHeader |
| `src/components/landing/HeroSection.tsx` | Ajustar padding-top |
| `src/components/landing/FeaturesGrid.tsx` | Adicionar `id="features"` |
| `src/components/landing/FAQSection.tsx` | Adicionar `id="faq"` |
| `src/index.css` | `scroll-behavior: smooth` no html |

