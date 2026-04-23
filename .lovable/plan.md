

# Refinamento Visual — `PublicApproval` no padrão "Magic Link Premium"

Trazer a mesma linguagem visual e fluidez do **PublicClientReport** (relatório público de tráfego) para a tela de aprovação: fundo escuro com gradientes radiais sutis, glassmorphism, animações Framer Motion em cascata, transições fluidas entre artes e micro-interações de luxo.

## 1. Fundo cinematográfico

- Trocar `bg-background` por `bg-[#0a0a1a]` (mesmo tom do relatório de tráfego), com **dois gradientes radiais** absolutos sobrepostos:
  - Topo: `radial-gradient(ellipse at top, rgba(59,130,246,0.08) 0%, transparent 60%)` (azul sutil).
  - Inferior direito: `radial-gradient(ellipse at bottom right, rgba(139,92,246,0.05) 0%, transparent 50%)` (violeta).
- Container raiz `relative overflow-hidden` para conter os gradientes.
- Texto base passa a `text-white` / `text-white/60` / `text-white/40` (mesma escala do relatório).

## 2. Header Premium animado

- Animar entrada com `motion.header` usando `headerVariants` (fade + slide down, easing `[0.22, 1, 0.36, 1]`, duration 0.7s).
- Logo da agência com `rounded-lg` e leve sombra; quando ausente, nome em `text-xl font-bold text-white`.
- Acima do logo: chip discreto `text-white/40 text-[11px] uppercase tracking-[0.25em]` com "APROVAÇÃO DE CONTEÚDO".
- Abaixo do nome: badge "Aguardando você" com **dot pulsante** (ping animation), padrão idêntico ao "Ao Vivo" do relatório, mas em âmbar/`amber-400` quando há pendentes e em emerald quando tudo aprovado.
- Contador "X de N respondidas" em `text-white/50 text-xs`.

## 3. Galeria com transições fluidas

- Envolver o `<Carousel>` em `motion.main` com `containerVariants` (stagger filhos 0.15s, delay 0.3s).
- **Glass frame ao redor do palco**: aplicar wrapper `bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl p-3` envolvendo o `GalleryStage`. Isso cria a moldura "magic link" característica.
- Palco interno: manter `h-[55vh] sm:h-[62vh] rounded-2xl bg-black` com a camada de `blur-2xl` + imagem `object-contain`. Adicionar **brilho radial** sutil no canto superior usando `::before` ou camada absoluta com gradient overlay para profundidade.
- Cada `CarouselItem` recebe entrada animada (Framer `motion.div` com `itemVariants` — fade + slide up).
- **Pip indicators redesenhados**: `bg-white/10` para inativos, `bg-gradient-to-r from-blue-500 to-violet-500` para o ativo, com `transition-all duration-500`. Largura ativa expandida para `w-6` (mais elegante).
- Setas Prev/Next (desktop) reestilizadas: `bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10`, sem o cinza padrão do shadcn.

## 4. Texto e legenda em vidro

- Título da arte: `text-white text-base font-semibold tracking-tight`.
- Descrição: `text-white/60 text-sm leading-relaxed line-clamp-3`.
- Botão "Ler legenda completa": `text-blue-400 hover:text-blue-300` com chevron animado (rotação 180° quando hover via `group-hover:translate-y-0.5`).
- Card de "Pedido de ajuste" anterior: trocar amber claro por `bg-amber-500/10 border border-amber-500/20 text-amber-300`.
- Drawer de legenda: `bg-[#0a0a1a] border-t border-white/10`, título e texto em white/foreground escala.

## 5. Sticky Action Bar — luxo iOS/Android

- Background: `bg-[#0a0a1a]/70 backdrop-blur-2xl border-t border-white/10` (mais escuro e mais translúcido que o atual).
- **Aprovar Arte**: manter emerald, mas adicionar `shadow-lg shadow-emerald-500/30` e leve `hover:shadow-emerald-500/50 transition-shadow`.
- **Solicitar Ajuste**: `bg-white/5 backdrop-blur-xl border border-white/10 text-white hover:bg-white/10` (mesmo glass dos cards do relatório), em vez de `variant="outline"` padrão.
- Quando submete: substituir `Loader2` por mesmo loader, mas com `text-white`.
- Adicionar **micro-animação de sucesso**: ao aprovar, exibir overlay rápido (`motion.div` com `CheckCircle2` pulsando + fade out em 600ms) antes do auto-advance — feedback tátil premium.
- Bloco de ajuste inline: animação `slide-in-from-bottom` mantida, mas Textarea com `bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-blue-500/50`.

## 6. Auto-advance com transição cinematográfica

- Após `submitDecision` resolver, manter o `scrollTo(idx)` mas com pequeno overlay de `motion.div` "✓ Próxima arte..." que fade-in/out em 400ms para suavizar a troca.
- Embla já anima a transição horizontal; com a moldura glass + stagger interno, o efeito ganha sensação de "passar foto no Instagram" como o usuário pediu.

## 7. AllDoneScreen no padrão tráfego

- Fundo: mesmo `bg-[#0a0a1a]` com gradientes radiais, agora **emerald no topo** para celebrar.
- `motion.div` com entrada em escala + fade.
- Ícone `CheckCircle2` `h-24 w-24` em emerald-400 com **glow** (`drop-shadow-[0_0_30px_rgba(16,185,129,0.6)]`) e ping ring atrás (mesma técnica do badge "Ao Vivo").
- Título `text-3xl font-bold text-white`. Subtítulo `text-white/60`.
- Botões em coluna mantidos, mas:
  - **Falar com o Gestor**: emerald com glow shadow.
  - **Rever aprovações**: glass `bg-white/5 backdrop-blur-xl border-white/10 text-white`.
- Footer "Powered by Orbity": `text-white/30 text-[11px] uppercase tracking-[0.25em]`.

## 8. Loading e Erro alinhados

- `CenterShell` em loading: fundo escuro + spinner em `text-white/40` + texto `text-white/50`.
- `ExpiredOrErrorScreen`: card glass (`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl`), ícone em círculo `bg-white/5`, textos em `text-white` / `text-white/50`. Mesma identidade do `ExpiredState` do relatório de tráfego.

## Detalhes técnicos

- **Adicionar Framer Motion**: `import { motion } from "framer-motion"` (já usado em outras páginas, sem nova dependência).
- **Variants reutilizados**: copiar `containerVariants`, `itemVariants`, `headerVariants` do `PublicClientReport` para manter consistência de timing/easing.
- **Tema fixo escuro**: a página pública não respeita o tema do usuário final (cliente da agência) — assume sempre o visual premium dark, igual ao relatório de tráfego.
- Sonner Toaster: trocar `richColors` para tema escuro com `theme="dark"` para combinar.

## Arquivos editados

- `src/pages/PublicApproval.tsx` — refatoração visual completa preservando toda a lógica (`fetchData`, `submitDecision`, carousel API, drawer, auto-advance, tipos). Apenas estilos, classes Tailwind, wrappers `motion.*` e variants são adicionados/alterados.

## Sem mudanças

- Edge Functions `approval-get` / `approval-decide` — preservadas.
- Contratos de dados (`ApprovalItem`, `ApprovalPayload`) — preservados.
- Roteamento `/approve/:token` — preservado.
- Componentes `Carousel`, `Drawer`, `AttachmentsDisplay` — reutilizados.

