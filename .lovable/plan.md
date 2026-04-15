

# Alinhar DifferentialsSection e PricingSection com paleta roxa premium

## Alterações

### 1. `src/components/landing/DifferentialsSection.tsx`
- **Fundo da secção** (linha 26): `bg-slate-950` → `bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950`
- **Cards** (linha 44): `bg-slate-900/50 border border-white/5` → `bg-white/5 backdrop-blur-md border border-white/10`; hover: `hover:bg-white/10` (manter `hover:border-purple-500/30` e restantes efeitos)

### 2. `src/components/landing/PricingSection.tsx`
- **Spotlight Card** (linha 70): `bg-slate-950` → `bg-gradient-to-br from-purple-950 to-indigo-950`
- **Anel glassmorphism**: Adicionar um `<div>` absoluto interior com `ring-1 ring-white/10 absolute inset-0 rounded-[2rem] pointer-events-none` para o efeito de vidro
- **Shadow glow**: Reforçar para `shadow-[0_0_50px_rgba(139,92,246,0.25)]`

Duas alterações cirúrgicas de classes CSS — sem mudanças de lógica ou estrutura.

