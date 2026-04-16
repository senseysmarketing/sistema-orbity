

# Inverter fundo da FAQ: bg-slate-50 no fundo, bg-white nos itens

## Alterações em `src/components/landing/FAQSection.tsx`

1. **Fundo da secção** (linha 50): `bg-white py-24` → `bg-slate-50 py-24` — iguala ao fundo da PricingSection
2. **Bloco de suporte** (linha 60): `bg-slate-50` → `bg-white` — inverte para branco
3. **AccordionItem** (linha 79): `bg-slate-50` → `bg-white` e `border-slate-100` → `border-slate-200` — itens brancos com borda ligeiramente mais visível no fundo cinza

Resultado: ambas as secções (Pricing e FAQ) terão `bg-slate-50`, e os cards/itens ficam brancos com destaque natural.

