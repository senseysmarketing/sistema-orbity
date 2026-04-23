

# Refatorar `PublicApproval.tsx` — Modo Galeria Premium (com 3 Refinamentos de Elite)

## Mudanças

### 1. Edge Function `approval-get/index.ts` — expor contato do gestor

No payload de retorno, adicionar `agency.contact_phone` (já existe na tabela `agencies`):

```ts
agency: {
  name: ...,
  logo_url: ...,
  contact_phone: (approval as any).agencies?.contact_phone ?? null, // NOVO
}
```

E incluir `contact_phone` no `select` da query. Profiles não possuem telefone, então o WhatsApp do gestor sempre cai no `agencies.contact_phone` (telefone padrão da agência) — sem necessidade de join com `task_assignments`/`profiles`.

### 2. `src/pages/PublicApproval.tsx` — refatoração completa

**Tipos** (atualizar `ApprovalPayload.agency`):
```ts
agency: { name: string; logo_url: string | null; contact_phone: string | null };
```

**Estrutura da página**:
- Container raiz: `min-h-screen bg-background flex flex-col` (neutro, segue tema do projeto).
- Cabeçalho minimalista (topo, `py-4 px-5`): logo (`h-10 object-contain`) ou nome da agência em `text-base font-medium tracking-tight`. Subtítulo `text-xs text-muted-foreground` com contador "X de N respondidas".
- Área principal: `flex-1 flex items-center` com o `<Carousel>` ocupando `w-full max-w-xl mx-auto px-4`.
- Captura `setApi={setCarouselApi}` + `useEffect` ouvindo `"select"` para atualizar o índice atual; também recalcula quando `data` muda.

**Refinamento #1 — Contentor de Media Adaptativo (Feed 1:1 + Stories 9:16)**:
- Cada `CarouselItem` renderiza um "palco" fixo: `relative w-full h-[60vh] sm:h-[65vh] rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/5`.
- Dentro do palco, opcional camada de **glass blur** com a própria imagem em `absolute inset-0 blur-2xl opacity-40 scale-110 object-cover` para criar moldura ambiente (efeito vidro de luxo).
- Acima dessa camada: `<img>` ou `<video>` em `relative h-full w-full object-contain` — garante que 1:1 e 9:16 aparecem sem corte, sempre centralizados.
- Pip indicators (`flex gap-1.5 justify-center mt-3`): ativa `bg-primary w-4`, demais `bg-muted w-1.5`, todas `h-1.5 rounded-full transition-all`.
- Texto abaixo do palco: título `text-base font-semibold` + preview da legenda em `line-clamp-3 text-sm text-muted-foreground`.

**Refinamento #2 — Gestão Inteligente de Legendas (Drawer)**:
- Se `description.length > 280` (ou contém >3 quebras `\n\n`), exibir botão "Ler legenda completa" (`variant="ghost" size="sm"` com ícone `<ChevronDown />`) abaixo do preview truncado.
- Ao clicar, abrir `<Drawer>` (shadcn/vaul, padrão Mobile-First) com:
  - `DrawerHeader`: título da tarefa.
  - Conteúdo: `whitespace-pre-wrap text-sm leading-relaxed` em `max-h-[60vh] overflow-y-auto`.
  - `DrawerFooter`: botão "Fechar".
- Em desktop o Drawer continua funcionando perfeitamente (vaul é responsivo).

**Refinamento #3 — Barra de Ações sticky com backdrop-blur**:
- `<div className="sticky bottom-0 inset-x-0 bg-background/80 backdrop-blur-xl border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">`
- Quando o item atual **não está decidido**: grid 2 colunas com `gap-3`:
  - **Aprovar Arte** (`size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white"`, ícone `<Check />`).
  - **Solicitar Ajuste** (`size="lg" variant="outline"`, ícone `<Pencil />`).
- Quando decidido: badge sutil ("✓ Aprovado por você" / "✏ Ajuste enviado") + botão "Próxima arte" se `canScrollNext`.
- Form de revisão: ao clicar em "Solicitar Ajuste", expande inline acima da barra (`animate-in slide-in-from-bottom-4`) com `Textarea` 500 chars, botão "Cancelar" (ghost) + "Enviar ajuste" (primary). Mantém `feedbacks[task_id]` state + `submitDecision(item, "revision")`.

**Auto-avanço mágico**:
- Após `submitDecision` resolver com sucesso, calcular próximo item pendente (`items.findIndex((it, idx) => idx > currentIndex && !it.decision)`); se existir → `carouselApi.scrollTo(nextIdx)`; senão deixa o re-render exibir `AllDoneScreen`.

**Refinamento #3 — `AllDoneScreen` com CTA de WhatsApp + Rever Aprovações**:
- Renderizada quando `data.items.every(i => i.decision)`.
- Layout centralizado vertical/horizontal, ocupa viewport (`min-h-screen flex flex-col items-center justify-center px-6 text-center`).
- Ícone `<CheckCircle2 className="h-20 w-20 text-emerald-500" />` com `animate-in zoom-in-50 duration-500`.
- Título `text-2xl font-semibold tracking-tight`: "Tudo pronto!".
- Subtítulo `text-muted-foreground`: "Agradecemos o seu feedback. A agência já foi notificada."
- Bloco de ações em coluna (`flex flex-col gap-3 mt-8 w-full max-w-xs`):
  - **"Falar com o meu Gestor"** — `size="lg"` com ícone `<MessageSquare />`. Renderizado **somente** se `data.agency.contact_phone` existir. Onclick: abre `https://wa.me/{digits}?text=Olá! Acabei de aprovar a arte de {agency.name} 👋` (digits = phone com `replace(/\D/g, "")`).
  - **"Rever aprovações"** — `variant="outline" size="lg"` com ícone `<RefreshCw />`. Onclick: força `setShowSummary(false)` e `carouselApi.scrollTo(0)`, retornando à galeria em modo "view-only" (botões substituídos pelo badge de status).
- Rodapé sutil: nome da agência + "Powered by Orbity" em `text-[11px] uppercase tracking-[0.25em] text-muted-foreground/60`.

**Estados existentes preservados**:
- `CenterShell` e `ExpiredOrErrorScreen` mantidos, apenas trocando `font-serif` por `font-sans` e `bg-neutral-50/text-neutral-900` por tokens do tema (`bg-background`, `text-foreground`, `text-muted-foreground`).

## Arquivos editados

- `supabase/functions/approval-get/index.ts` — incluir `contact_phone` no select e no payload de `agency`.
- `src/pages/PublicApproval.tsx` — refatoração completa (mantém `fetchData`, `submitDecision`, contratos das edge functions). Adiciona `useState<CarouselApi>`, `useState<number>(currentIndex)`, `useState<boolean>(showSummary)`, `AllDoneScreen` com CTAs, Drawer para legendas longas, palco de mídia com glass blur, sticky bar com backdrop-blur.

## Sem mudanças

- Edge Function `approval-decide` — preservada.
- Roteamento (`/approve/:token`) — preservado.
- Componentes `Carousel`, `Drawer`, `AttachmentsDisplay` (reutilizados como fallback para anexos não-imagem/vídeo) — sem alteração.
- Demais páginas e fluxos — não tocados.

