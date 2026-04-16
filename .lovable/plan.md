
# Ajustes UX no PricingSection: Toggle Mensal + Animação de Preço

## Alterações em `src/components/landing/PricingSection.tsx`

### 1. Estado inicial → Mensal (linha 22)
- `useState(true)` → `useState(false)`

### 2. Animação no bloco de preço (linhas ~119-133)
- Envolver o div do preço + subtítulo com:
  - `key={isAnnual ? 'annual' : 'monthly'}` para forçar remontagem
  - Classes: `animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-500 ease-out`

### 3. Guardrail: Badge "Poupa R$ 1.200/ano"
- O badge condicional `{isAnnual && (<span>...Poupa R$ 1.200/ano...</span>)}` permanece intacto fora do bloco animado, junto ao toggle — sem qualquer alteração

### Ficheiro alterado
- `src/components/landing/PricingSection.tsx` — 2 edições cirúrgicas (linha 22 + bloco de preço)
