

# Corrigir consistência de fundo entre seções

## Problema
A `ProblemSection` usa `bg-slate-50/50` (50% opacidade) enquanto a `DemoSection` e `IntegrationsSection` usam `bg-slate-50` (opaco). Isso cria uma diferença sutil mas visível de tom entre as seções.

## Alteração
**`src/components/landing/ProblemSection.tsx` — Linha 28**
- Trocar `bg-slate-50/50` por `bg-slate-50`

Isso unifica o fundo de todas as seções do bloco claro da landing page.

