

# Ajustes no widget Onboarding Checklist

## 1. Adicionar comunicação clara da oferta R$100 (sempre visível enquanto incompleto)

Hoje o desconto só aparece como um chip âmbar de countdown — e **só** quando `created_at + 24h` ainda não expirou. Em contas com mais de 24h (como a sua de teste), a regra fica invisível. Vou tornar a mensagem explícita em **3 estados**, logo abaixo do header:

**Estado A — Dentro das 24h (incompleto):**
> Banner âmbar destacado: "🎁 Complete os 5 passos em 24h e ganhe R$100 OFF na primeira mensalidade — `{Xh Ym}` restantes"

**Estado B — Após 24h (incompleto):**
> Banner neutro/discreto: "A janela do bônus de R$100 expirou, mas configurar sua agência ainda vale muito. Continue quando puder."

**Estado C — Concluído + elegível:**
> (Mantém badge dourado "Cupom de R$100 desbloqueado" no footer — já existe.)

Isso resolve o caso da conta antiga: a oferta passa a ser explicada mesmo quando o tempo já passou, deixando claro que existe (existiu) um bônus.

## 2. Remover o gradiente roxo do topo

Remover o bloco:
```tsx
<div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/5 to-transparent" />
```
e o `relative overflow-hidden` da `Card`, deixando o card com o mesmo tratamento sólido (`bg-card`) dos demais blocos do dashboard.

## 3. Pequenos ajustes de coerência

- O ícone `Sparkles` no header vai ganhar um leve realce visual (mantendo o `bg-primary/10` como nos outros cards do dashboard) — sem gradiente.
- Mover/remover o chip de countdown do header: a informação passa para o banner principal (mais visível e legível).

## Arquivos alterados
- `src/components/onboarding/OnboardingChecklist.tsx` (única alteração)

## Não-mexer
- Lógica RPC `complete_fast_track`, queries, dismiss, confetti — tudo permanece igual.
- Layout do Dashboard, demais cards.

