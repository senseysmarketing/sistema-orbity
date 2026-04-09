

# Ajustes na Aba de Agencias: Layout, Paginacao e Pesquisa

## Alteracoes em `src/components/master/AgenciesTable.tsx`

### 1. Layout: Botao na mesma linha dos status cards
- Receber `onCreated` como prop (ou receber o botao como children)
- Mover o botao "Cadastrar Nova Agencia" para dentro do `AgenciesTable`, na mesma linha dos status cards
- Grid: 4 cards + botao alinhado a direita na mesma row

### 2. Campo de pesquisa
- Adicionar state `searchTerm`
- Input com icone de Search acima da tabela, ao lado do botao "Atualizar"
- Filtrar `agencies` por `agency_name` (case-insensitive)

### 3. Paginacao
- State `currentPage` (default 1), constante `ITEMS_PER_PAGE = 10`
- Aplicar slice no array filtrado
- Renderizar controles de paginacao abaixo da tabela (anterior/proximo + indicador de pagina)
- Reset para pagina 1 quando searchTerm muda

### 4. `src/pages/Master.tsx`
- Mover `CreateAgencyDialog` para dentro de `AgenciesTable` (passar `onCreated` como prop)
- Remover o `div flex justify-end` que envolve o botao

## Arquivos modificados
- `src/components/master/AgenciesTable.tsx`
- `src/pages/Master.tsx`

