

# Remover Testimonials + Redesign Premium da FAQ

## Ficheiros alterados

### 1. Apagar `src/components/landing/TestimonialsSection.tsx`

### 2. `src/pages/LandingPage.tsx`
- Remover import de `TestimonialsSection` (linha 12)
- Remover `<TestimonialsSection />` do JSX (linha 90)
- Simplificar props da `<FAQSection>`: remover `onOpenApplication` e `onOpenScheduling`

### 3. `src/components/landing/FAQSection.tsx` — Reescrever completo

**Layout split 4/8:**
- Secção: `bg-white py-24` com `id="faq"`
- Grid: `grid lg:grid-cols-12 gap-12 lg:gap-24 max-w-7xl mx-auto px-4`

**Coluna esquerda (lg:col-span-4):**
- `lg:sticky lg:top-32 h-fit`
- H2 "Perguntas Frequentes" — `text-4xl font-bold tracking-tight text-slate-900 mb-4`
- Subtítulo: "Tudo o que precisa de saber sobre o Orbity."
- Bloco suporte: "Ainda tem dúvidas?" + botão outline WhatsApp com `MessageCircle` e texto "Falar com Especialista"
- Remove os 3 botões antigos e props `onOpenApplication`/`onOpenScheduling`

**Coluna direita (lg:col-span-8):**
- Accordion shadcn com cada `AccordionItem` como card:
  - `bg-slate-50 border border-slate-100 rounded-2xl mb-4 px-6 overflow-hidden border-b-0`
  - Estados open: `data-[state=open]:bg-white data-[state=open]:shadow-md data-[state=open]:border-purple-500/20 data-[state=open]:ring-1 data-[state=open]:ring-purple-500/10 transition-all duration-300`
- `AccordionTrigger`: `font-semibold text-slate-900 hover:no-underline` + chevron com `transition-transform duration-300`
- `AccordionContent`: `text-slate-600 leading-relaxed`

