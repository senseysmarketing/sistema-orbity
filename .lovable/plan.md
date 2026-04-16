

# Redesign CTASection: Convite VIP com Glassmorphism

## Alterações

### 1. `src/components/landing/CTASection.tsx` — Reescrita completa

**Imports:** Substituir `Shield` por `Zap`, `LockOpen`, `MessageCircle`. Manter `ArrowRight`, `CalendarDays`.

**Fundo:** `bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 py-24`

**Card Glassmorphism central:**
- `max-w-5xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-12 md:p-20 text-center shadow-[0_0_50px_rgba(139,92,246,0.15)] relative overflow-hidden`
- Reflexo de luz: `<div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />`

**Copy:**
- H2: "A sua agência no estado da arte." — `text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight`
- Subtítulo: "Junte-se à nova era da gestão..." — `text-lg text-slate-300 mb-10 max-w-2xl mx-auto`

**Botões:**
- Principal: `bg-white text-purple-950 hover:bg-slate-100 font-semibold shadow-[0_0_25px_rgba(139,92,246,0.2)] hover:shadow-[0_0_35px_rgba(139,92,246,0.4)] transition-all` + "Começar Teste Grátis" + ArrowRight
- Secundário: `bg-white/10 text-white border border-white/20 hover:bg-white/20` + CalendarDays + "Agendar Apresentação"

**Selos de garantia (substituem métricas):**
- Container: `mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8`
- 3 selos em `text-sm text-slate-400 flex items-center gap-2`:
  - ⚡ Zap → "Setup Imediato"
  - 🔓 LockOpen → "Sem Fidelidade"
  - 💬 MessageCircle → "Suporte via WhatsApp"

### 2. `src/pages/LandingPage.tsx` (linha 91)
- Manter props `onOpenScheduling` na chamada do `CTASection`
- Remover `onOpenApplication` (não usado no novo design)

### Ficheiros alterados
- `src/components/landing/CTASection.tsx` — reescrita completa
- `src/pages/LandingPage.tsx` — simplificar props (remover `onOpenApplication`)

