

# Ajustes finais — Footer "Powered by Orbity" + Botões flutuantes

## 1. Rodapé "Powered by Orbity" sempre visível

- Adicionar um rodapé fixo discreto na base da página (`fixed bottom-0` em camada inferior à action bar, ou logo abaixo dela), centralizado.
- Texto: `Powered by Orbity` em `text-[11px] uppercase tracking-[0.3em] text-white/40`.
- Posicionado **abaixo** da barra de ações flutuante, como assinatura permanente da plataforma — visível tanto na galeria quanto na `AllDoneScreen`.
- Estrutura: `<div className="fixed bottom-2 inset-x-0 text-center pointer-events-none z-10">Powered by Orbity</div>`.

## 2. Botões flutuantes (sem barra sticky)

- Remover o wrapper `sticky bottom-0 ... bg-[#0a0a1a]/70 backdrop-blur-2xl border-t border-white/10` que prende os botões na barra inferior.
- Substituir por um contêiner **flutuante centralizado**: `fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md`.
- Os dois botões (Aprovar Arte / Solicitar Ajuste) ficam lado a lado em `grid grid-cols-2 gap-3`, **sem fundo de barra** atrás — apenas os botões sólidos flutuando sobre o conteúdo.
- Cada botão mantém:
  - **Aprovar Arte**: emerald sólido com `shadow-2xl shadow-emerald-500/40` (glow mais forte para destacar do fundo escuro).
  - **Solicitar Ajuste**: glass `bg-white/10 backdrop-blur-2xl border border-white/15 text-white shadow-2xl shadow-black/40` (glow escuro para flutuar melhor).
- Para o estado **decidido** (badge "✓ Aprovado") e o estado **form de revisão inline**: mesmo container flutuante, com painel glass `bg-[#0a0a1a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl` apenas quando há conteúdo expandido (textarea de ajuste ou badge).

## 3. Espaçamento da galeria

- Adicionar `pb-32` ao contêiner principal do carousel para garantir que o conteúdo não fique escondido atrás dos botões flutuantes.
- O rodapé "Powered by Orbity" usa `pointer-events-none` para não bloquear cliques na área dos botões.

## 4. AllDoneScreen

- Manter os CTAs ("Falar com o Gestor" e "Rever aprovações") no fluxo normal da tela (não flutuantes) — pois ali já são o foco principal.
- O rodapé fixo "Powered by Orbity" continua visível no canto inferior, substituindo o footer atual que vivia dentro do conteúdo da `AllDoneScreen`.
- Remover o "Powered by Orbity" interno da `AllDoneScreen` (vira redundante com o global).

## Arquivo editado

- `src/pages/PublicApproval.tsx` — apenas ajustes de classe/estrutura: remover wrapper sticky, adicionar contêiner flutuante para os botões, adicionar rodapé global fixo, adicionar `pb-32` no main.

## Sem mudanças

- Lógica de `submitDecision`, carousel API, auto-advance, drawer de legenda — preservadas.
- Edge functions — preservadas.
- Demais visuais (glass frame, gradientes, animações Framer Motion) — preservados.

