

# Refatorar Lista para Mini Cards em Grid — Painel de Trafego

## Resumo
Substituir o `ClientListRow` (linhas horizontais) por mini cards compactos em grid (3-4 por linha no desktop). Cada card mostra apenas as informacoes essenciais. Clique abre o Sheet lateral (que ja esta pronto e aprovado).

## O que muda

### 1. Criar `src/components/traffic/ClientMiniCard.tsx`
Card compacto com layout vertical:

- **Borda superior ou lateral colorida** por status (verde/amarelo/vermelho)
- **Nome** do cliente (truncado) + badge tipo (Pre/Pos) pequeno
- **Valor principal** grande e colorido (saldo para pre-paga, gasto mes para pos-paga)
- **Badge de resultados** (Excelentes/Bons/Medios/Ruins/N-D)
- **Indicador de otimizacao**: icone + "Xd" (laranja se >7 dias)
- **Gestor**: nome ou "Sem gestor" em texto discreto
- **Hover**: shadow + cursor pointer
- Card inteiro clicavel para abrir o Sheet lateral
- Botao de refresh (pequeno, canto superior direito)

Layout estimado por card: ~180-220px de altura, responsivo

### 2. Refatorar `src/components/traffic/ClientsPanel.tsx`
- Substituir o mapeamento de `<ClientListRow>` por `<ClientMiniCard>`
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3`
- Manter toda a logica de filtros, stats cards, state do Sheet lateral

### 3. Manter `ClientListRow.tsx`
- Nao deletar, apenas deixa de ser usado pelo ClientsPanel

## Arquivos
- `src/components/traffic/ClientMiniCard.tsx` (criar)
- `src/components/traffic/ClientsPanel.tsx` (editar — trocar ClientListRow por ClientMiniCard no render)

