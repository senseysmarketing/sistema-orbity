

# Ajustes na Sheet de Configurações do CRM

## Mudanças

### 1. `src/pages/CRM.tsx` — Sheet mais estreito
- Trocar `className="w-full sm:max-w-[800px] md:max-w-[1000px] overflow-y-auto border-l"` por `className="w-full sm:max-w-md overflow-y-auto border-l"` (largura tipo sidebar, ~28rem).

### 2. `src/components/crm/CRMSettings.tsx` — Layout vertical + remover título duplicado
- Remover o bloco `<div>` com `<h2>Configurações do CRM</h2>` + descrição (linhas ~63-68). O `SheetHeader` no pai já mostra "Configurações do CRM".
- **Opção A (escolhida)**: manter a descrição "Personalize seu pipeline de vendas e integrações" como subtítulo discreto antes do grid, pois dá contexto. Remover apenas o `<h2>`.
- Trocar grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` por `grid-cols-1` (cards empilhados verticalmente).

## Resultado
- Sheet ocupa ~448px (sm:max-w-md), liberando o resto da tela.
- Cards empilhados verticalmente, um por linha, mantendo `h-full` irrelevante (já que cada card define sua altura natural).
- Título "Configurações do CRM" aparece apenas uma vez (no `SheetHeader`).

## Ficheiros alterados
- `src/pages/CRM.tsx` (1 linha — className do SheetContent)
- `src/components/crm/CRMSettings.tsx` (remover h2 + ajustar grid)

