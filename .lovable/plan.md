

# Reformulacao da Hero Section com Mascote Orbi

## Resumo
Reescrever a Hero Section com fundo escuro roxo, mascote Orbi flutuante com glow, icones orbitantes, header adaptativo ao scroll, e layout split responsivo.

## Alteracoes

### 1. Copiar mascote para o projeto
- `lov-copy user-uploads://Design_sem_nome_2.png src/assets/orbi-mascot.png`

### 2. `tailwind.config.ts` -- Adicionar keyframes
- `float`: translateY(0) -> translateY(-12px) -> translateY(0), 3s ease-in-out infinite
- `orbit`: rotate(0deg) -> rotate(360deg), 12s linear infinite (para icones decorativos)

### 3. `src/components/landing/HeroSection.tsx` -- Reescrita completa

**Layout**: Flex row em desktop (texto esquerda, Orbi direita), coluna em mobile (texto cima, Orbi baixo).

**Fundo**: `bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950` com SVG de constelacao a 5% opacity como elemento absoluto.

**Textos** (todos brancos):
- Badge: fundo branco/10, borda branca/20, texto branco
- H1: "O Ecossistema Completo para Escalar a sua Agencia de Marketing." -- `text-4xl md:text-5xl lg:text-6xl tracking-tight font-bold text-white`
- Sub-headline: "Tarefas, Campanhas, CRM integrado e Financeiro automatizado com WhatsApp. Tudo em um so lugar." -- `text-lg md:text-xl text-white/70`

**Botoes**:
- Primario: `bg-white text-purple-950 hover:bg-white/90`
- Secundario: `border-white/30 text-white hover:bg-white/10`

**Mascote Orbi**:
- Import da imagem como modulo ES
- `animate-float` + `drop-shadow-[0_0_30px_rgba(139,92,246,0.3)]`
- Desktop: `max-w-md lg:max-w-lg`
- Mobile: `max-w-[250px] mx-auto`

**Icones decorativos**: 3 icones (MessageCircle para WhatsApp, BarChart3, DollarSign) posicionados absolutos ao redor do Orbi com `opacity-30`, animacao orbit com delays escalonados.

**AgencyLogos**: Adaptar texto para `text-white/50` e `text-white/70`. Passar prop ou criar wrapper com classes claras.

**Remocao**: Dashboard generico, imports LayoutDashboard/Users/TrendingUp/CheckSquare.

### 4. `src/components/landing/AgencyLogos.tsx` -- Adaptar para fundo escuro
- Mudar `text-muted-foreground` para `text-white/60` nos spans
- Manter os icones (ja tem fundo escuro, ficam bem)

### 5. `src/components/landing/LandingHeader.tsx` -- Header adaptativo ao scroll

**Novo estado**: `scrolled` via `useEffect` com listener de scroll (threshold ~50px).

**Quando `scrolled = false`** (topo, sobre fundo escuro):
- `bg-transparent border-transparent`
- Logo: `text-white` (texto puro, sem gradient)
- Nav links: `text-white/70 hover:text-white`
- Botao Entrar: `text-white hover:bg-white/10`
- Botao CTA: `bg-white text-purple-950`
- Menu hamburger: `text-white`

**Quando `scrolled = true`**:
- `bg-background/80 backdrop-blur-md border-border/50` (comportamento atual)
- Cores voltam ao normal (escuras)

**Transicao**: `transition-all duration-300` no header.

## Arquivos alterados
1. `src/assets/orbi-mascot.png` (novo -- copiado do upload)
2. `src/components/landing/HeroSection.tsx` (reescrita)
3. `src/components/landing/AgencyLogos.tsx` (cores adaptadas)
4. `src/components/landing/LandingHeader.tsx` (scroll-aware)
5. `tailwind.config.ts` (keyframes float/orbit)

