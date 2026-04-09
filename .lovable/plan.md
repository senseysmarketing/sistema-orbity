

# Nova Seção: AI Features na Landing Page

## Resumo
Criar `AIFeaturesSection.tsx` com visual high-tech (gradiente radial escuro, glassmorphism, animações staggered) e integrar na `LandingPage.tsx` após `FeaturesGrid`.

## Alterações

### 1. Criar `src/components/landing/AIFeaturesSection.tsx`
- Fundo com gradiente radial sutil (tons roxos/azuis escuros via CSS inline ou classes Tailwind)
- Badge com `<Sparkles>` e texto "Orbity AI Copilot"
- Título h2: "Um cérebro treinado para escalar agências."
- Subtítulo com copy sobre cancelar IAs genéricas
- Grid 2x2 com 4 cards glassmorphism (`bg-white/5 backdrop-blur-sm border border-white/10`):
  - **Contratos Inteligentes** (Scale) — Copiloto Jurídico
  - **Redator e Estrategista** (PenTool) — Diretor de Conteúdo
  - **Análise de Campanhas** (LineChart) — Analista de Performance
  - **Automação Operacional** (ListChecks) — Gerente de Projetos
- Cada card com hover glow (`hover:border-violet-500/30 hover:shadow-violet-500/10`)
- Animações framer-motion: `whileInView` fade-in + scale com `staggerChildren: 0.15`

### 2. Atualizar `src/pages/LandingPage.tsx`
- Importar e inserir `<AIFeaturesSection />` logo após `<FeaturesGrid />`

### Padrões seguidos
- Mesma estrutura de animação da `FeaturesGrid` (motion.div, whileInView, viewport once)
- Mesma paleta roxa/violeta (`#1c102f`, `violet-500/600`)
- Container e padding consistentes com demais seções

