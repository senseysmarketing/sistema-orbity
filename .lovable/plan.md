

# Reorganizar Filtros e Stats Cards do Painel de Clientes

## Resumo
Melhorar a organizacao visual dos filtros e cards de resumo, tornando a area mais compacta e com hierarquia visual clara.

## Mudancas

### `src/components/traffic/ClientsPanel.tsx`

**1. Stats Cards → Barra compacta inline (em vez de 5 cards separados)**
- Substituir os 5 Cards individuais por uma unica linha horizontal com os contadores como "chips" ou badges inline dentro de um unico Card
- Layout: `Total: 26 | ● Saudaveis: 14 | ▲ Atencao: 0 | △ Criticos: 12 | ⏱ Otimizar: 5`
- Clicaveis como filtro rapido (clicar em "Criticos" ativa o filtro correspondente)

**2. Filtros → Layout mais compacto e alinhado**
- Colocar os switches (Sem saldo/Critico e Precisa otimizar) na mesma linha horizontal
- Remover as descricoes (textos auxiliares) dos switches — o nome ja e auto-explicativo
- Alinhar Selects (Resultados, Gestor) e Switches na mesma linha em desktop
- Mover "Limpar filtros" e "Mostrando X de Y" para o final da mesma linha
- Remover o Card wrapper dos filtros, usar apenas um `div` com `border-b` ou manter card mas com padding menor

**3. Ordem visual**
- Header (titulo + botao atualizar)
- Filtros (uma unica linha compacta)
- Stats bar (contadores inline clicaveis)
- Grid de mini cards

## Arquivo
- `src/components/traffic/ClientsPanel.tsx` (editar linhas 626-755)

