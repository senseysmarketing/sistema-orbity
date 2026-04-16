

# Reorganizar header da listagem de Clientes

## Alteração
Mover badges e botões (Gerenciar Carteira, Novo Cliente) do header para a linha dos filtros, e mudar o botão "Novo Cliente" de `variant="create"` para `variant="default"` (cor escura como o botão "Ativos").

## Ficheiro: `src/pages/Clients.tsx`

**Header (linhas 88-117):** Remover os badges e botões, ficando apenas o título e descrição.

**Filtros (linhas 119-140):** Unificar tudo numa única linha:
- Search input (esquerda)
- Botões de filtro (Todos, Ativos, Inativos)
- Espaçador flex
- Badges (ativos/inativos)
- Botão "Gerenciar Carteira" (outline)
- Botão "Novo Cliente" — trocar `variant="create"` para `variant="default"` (bg escuro, igual ao "Ativos")

Layout: `flex flex-wrap items-center gap-3` para acomodar todos os elementos na mesma linha, com wrap em mobile.

## Resultado visual
Linha única: `[🔍 Buscar...] [Todos] [Ativos] [Inativos]  ——  [23 ativos] [28 inativos] [Gerenciar Carteira] [+ Novo Cliente]`

