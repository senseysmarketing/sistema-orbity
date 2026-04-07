

# Redesign Landing Page com Framer Motion - Estilo Apple

## Resumo
Instalar `framer-motion`, refatorar o HeroSection com nova copy e animacao de texto revelado (word-by-word com spring), transformar o FeaturesGrid em Bento Grid com nova copy orientada a beneficios, e adicionar animacoes de scroll + efeito tilt 3D nos cards principais. Header/Footer ganham fade-in animado.

## Arquivos Modificados

### 1. `package.json` - Instalar framer-motion
- Adicionar `"framer-motion": "^11.x"` as dependencias

### 2. `src/components/landing/HeroSection.tsx` - Redesign completo
- Importar `motion` do framer-motion
- Nova copy:
  - Titulo: "Orbity: O Sistema Operacional das Agencias de Alta Performance."
  - Subtitulo: "Centralize CRM, Financeiro, Trafego e Social em uma plataforma inteligente. Automatize processos, fature mais e pare de queimar neuronios com planilhas."
  - Botao principal: "Agendar Demonstracao Gratuita" (com seta)
- Layout centralizado (remover grid 2 colunas, texto centralizado imponente)
- Titulo com fonte maior (`text-5xl md:text-6xl lg:text-7xl`)
- Animacao word-by-word: split do titulo em palavras, cada `<motion.span>` com `variants` usando `type: "spring"` e delay incremental
- Mock dashboard mantido abaixo como elemento visual secundario com `motion.div` fade-in com delay
- Manter AgencyLogos, badge e botao secundario

### 3. `src/components/landing/FeaturesGrid.tsx` - Bento Grid com nova copy
- Importar `motion` do framer-motion
- Nova copy dos cards (beneficios):
  - CRM: "Feche Mais Contratos" / "Pipeline visual e automacao de leads"
  - Trafego: "Escale o ROI de Anuncios" / "Monitoramento de Meta e Google Ads integrado"
  - Criativo: "Produza Criativos que Convertem" / "Prazos, briefings e aprovacao em um clique"
  - Financeiro: "Inadimplencia Zero" / "Cobranca automatica por PIX/Boleto e fluxo de caixa"
  - Social: "Gestao de Conteudo Simplificada" / "Calendario editorial e agendamento de posts"
  - Relatorios: "Decisoes Baseadas em Dados" / "Dashboards de performance em tempo real"
- Grid reorganizado: 2 cards grandes (CRM e Trafego em `col-span-2`) + 4 cards menores
- Cada card usa `motion.div` com `whileInView` (slideUp + fadeIn) e delay incremental via `transition.delay`
- Titulo da secao tambem com `motion.div` whileInView

### 4. `src/components/landing/FeatureCard.tsx` - Adicionar efeito tilt 3D
- Importar `motion, useMotionValue, useTransform, useSpring` do framer-motion
- Props: adicionar `large?: boolean` para identificar cards CRM/Trafego
- Para cards `large`: implementar efeito tilt 3D:
  - `onMouseMove` calcula posicao relativa do mouse
  - `useMotionValue` para x/y
  - `useTransform` converte para `rotateX` (-5 a 5 graus) e `rotateY` (-5 a 5 graus)
  - `useSpring` para suavizar o movimento
  - `onMouseLeave` reseta para 0
  - Aplicar `style={{ rotateX, rotateY, transformPerspective: 1000 }}`
- Todos os cards: wrappados em `motion.div` (ja recebem whileInView do pai)

### 5. `src/components/landing/LandingFooter.tsx` - Fade-in animado
- Wrapper `motion.footer` com `initial={{ opacity: 0, y: 20 }}` e `whileInView={{ opacity: 1, y: 0 }}`

### 6. `src/pages/LandingPage.tsx` - Sem mudancas estruturais
- Componentes ja estao importados; as animacoes sao internas a cada componente

## Detalhes Tecnicos

- `framer-motion` e a unica dependencia nova
- Animacoes usam `whileInView` com `viewport={{ once: true }}` para performance (anima so 1x)
- Efeito tilt usa `useMotionValue` + `useTransform` + `useSpring` - padrao recomendado do framer-motion
- Texto revelado no Hero usa `motion.span` com `variants` container/child e `staggerChildren`
- Paleta mantida: `#1c102f`, `violet-500/600`, `bg-background`, `text-foreground`, `border-border`

