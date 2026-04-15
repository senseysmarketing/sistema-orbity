

# Redesign: ProblemSection (Light) + FeaturesGrid & AI (Dark Unificado)

## Resumo
Transformar 3 secções da landing page: ProblemSection como bloco light minimalista com 3 cards de métricas, FeaturesGrid + AIFeaturesSection como bloco dark contínuo com glassmorphism, usando wrapper no LandingPage.tsx para evitar "gradient seam".

## Estrutura Visual
```text
┌─────────────────────────────────────────────┐
│  ProblemSection (Light, bg-slate-50/50)      │
│  H2: "O caos invisível que devora o lucro"   │
│  ┌──────┐  ┌──────┐  ┌──────┐               │
│  │ 15h  │  │ 40%  │  │  3x  │  ← métricas  │
│  └──────┘  └──────┘  └──────┘               │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  WRAPPER DIV (gradiente único)               │
│  bg-gradient-to-br from-purple-950           │
│  via-purple-900 to-indigo-950                │
│                                              │
│  ┌── FeaturesGrid (bg-transparent) ────┐     │
│  │  Bento Grid 3-col glassmorphism     │     │
│  │  CRM + Social = lg:col-span-2      │     │
│  └─────────────────────────────────────┘     │
│  ┌── AIFeaturesSection (bg-transparent)─┐    │
│  │  4 AI cards glassmorphism            │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

## Alterações por Ficheiro

### 1. `src/pages/LandingPage.tsx`
- Envolver `<FeaturesGrid />` e `<AIFeaturesSection />` numa `<div className="bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950">`
- Isto garante gradiente contínuo sem "seam"

### 2. `src/components/landing/ProblemSection.tsx` — Reescrita completa
- **H2**: "O caos invisível que devora o lucro da sua agência."
- **Subtítulo**: "Enquanto sua equipe luta contra o caos, oportunidades escapam silenciosamente."
- Substituir os 6 cards de problemas por **3 cards de métrica**:
  - "15h" — "desperdiçadas por semana em tarefas manuais"
  - "40%" — "dos leads perdidos por falta de follow-up"
  - "3x" — "mais retrabalho sem sistema centralizado"
- **Estilo cards**: `bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50`
- **Números**: `text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600`
- Fundo secção: `bg-slate-50/50`
- Manter botão CTA com navigate para onboarding
- Usar motion.div para animações

### 3. `src/components/landing/FeaturesGrid.tsx` — Reescrita completa
- **Fundo**: `bg-transparent` (gradiente vem do wrapper pai)
- **Copy**: H2 = "O seu novo ecossistema de alta performance." / Subtítulo = "Substitua dezenas de ferramentas fragmentadas por uma única plataforma inteligente." (texto branco)
- **Grid**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- **Layout Bento**: CRM (`lg:col-span-2`) e Social Media (`lg:col-span-2`) como cards maiores; Criativos, Financeiro, Conteúdo, Dashboards como `col-span-1`
- **Renderizar cards inline** (sem FeatureCard) com glassmorphism: `bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden group hover:bg-white/10 hover:border-purple-500/30 transition-all duration-500 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)]`
- Ícones: fundo `bg-white/10 rounded-xl`, cor `text-violet-400`, `group-hover:scale-105 transition-transform duration-500`
- Texto: títulos `text-white`, descrições `text-white/60`
- Botão CTA: variante outline com bordas brancas
- **Sem imagens** (não existem mockups no projeto) — manter ícones com estilo premium
- **Padding inferior**: `pb-8` para fusão suave com AI section

### 4. `src/components/landing/AIFeaturesSection.tsx` — Ajustes
- **Fundo**: Remover inline `style={{ background: ... }}`, usar `bg-transparent` (gradiente do wrapper)
- **Cards**: Atualizar `rounded-2xl` para `rounded-3xl` e adicionar `backdrop-blur-md` para consistência
- **Padding**: `pt-8 pb-24` para fusão visual com FeaturesGrid

### 5. `src/components/landing/FeatureCard.tsx` — Eliminar
- Usado apenas pelo FeaturesGrid (confirmado por search). Apagar o ficheiro.

## Nota sobre Imagens
O utilizador pediu para manter imagens/mockups nos cards do Bento Grid. No entanto, **não existem imagens importadas** no FeaturesGrid atual nem no projeto de landing. Os cards usam apenas ícones via FeatureCard. Implementarei os cards com ícones premium em estilo glassmorphism, que é visualmente superior. Se o utilizador quiser adicionar screenshots do sistema futuramente, o layout com `overflow-hidden` na base do card já estará preparado.

