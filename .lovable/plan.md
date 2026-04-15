

# Implementação: Redesign PricingSection + Limpeza PlanSelectionStep

## 1. Reescrita completa: `src/components/landing/PricingSection.tsx`

**Layout split-screen** com `bg-slate-50 py-24`:
- Grid `lg:grid-cols-2 gap-12 max-w-6xl mx-auto` (mobile: 1 coluna, checklist primeiro, card em baixo)
- **Coluna esquerda**: H2 "O motor de crescimento da sua agência.", subtítulo, checklist com `CheckCircle2` roxo (7 funcionalidades do arsenal)
- **Coluna direita**: Spotlight Card dark (`bg-slate-950 rounded-[2rem] border-purple-500/30 shadow glow`) com:
  - Toggle pill Mensal/Anual, estado inicial `useState(true)` (Anual)
  - Badge "Poupa R$ 1.200/ano" ao lado do Anual
  - Preço dinâmico gigante (R$ 297 ou R$ 397) em branco
  - CTA principal + botão "Agendar Apresentação"
  - `group hover:border-purple-500/60 transition-all duration-500`
- Imports limpos: remover `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Badge`, `Sparkles`, `Switch`. Adicionar `CheckCircle2`.

## 2. Limpeza completa: `src/components/onboarding/PlanSelectionStep.tsx`

**DB validada**: slugs ativos são `orbity_monthly` (R$397), `orbity_annual` (R$297/mês), `orbity_trial` (R$0).

- Remover toda a lógica de 3 planos (grid 3 colunas, `getPlanIcon`, `getPlanFeatures`, interface `SubscriptionPlan` complexa)
- Substituir por seletor de ciclo de faturação com 2 cards lado a lado:
  - "Mensal" R$397/mês — slug `orbity_monthly`
  - "Anual" R$297/mês (R$3.564/ano) — slug `orbity_annual`, badge "Economia de R$1.200"
- Manter fetch da DB para validar slugs e obter `plan_id` real, mas filtrar apenas `orbity_monthly` e `orbity_annual`
- Manter `prevStep`/`nextStep`, tracking Meta Pixel, `updatePlanSelection`
- Remover imports não usados (`Crown`, `Star`, `Zap`)

## Guardrails aplicados
1. **Slugs validados**: `orbity_monthly` e `orbity_annual` confirmados na tabela `subscription_plans`
2. **Toggle state**: `useState(true)` — Anual como default de conversão
3. **Mobile**: Grid colapsa naturalmente, checklist em cima, card em baixo, `gap-12` mantém espaçamento

## Ficheiros alterados
- `src/components/landing/PricingSection.tsx` — reescrita completa
- `src/components/onboarding/PlanSelectionStep.tsx` — limpeza e simplificação

