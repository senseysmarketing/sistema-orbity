

# Adicionar Paginacao na Lista de Leads

## Alteracao

Adicionar estado de paginacao no componente `LeadsList.tsx` com 25 leads por pagina, exibindo controles de navegacao abaixo da tabela.

### Arquivo: `src/components/crm/LeadsList.tsx`

1. Adicionar `useState` para `currentPage` (iniciar em 1)
2. Definir `ITEMS_PER_PAGE = 25`
3. Calcular `totalPages`, `paginatedLeads` (slice do array ordenado)
4. Renderizar apenas `paginatedLeads` na tabela
5. Abaixo da tabela, adicionar controles de paginacao usando os componentes existentes de `@/components/ui/pagination` (Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink)
6. Mostrar info "Mostrando X-Y de Z leads"
7. Resetar `currentPage` para 1 quando a lista de leads mudar (via `useEffect`)

