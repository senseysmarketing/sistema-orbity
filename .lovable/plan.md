

# Mover "X leads" e "Exportar" para a linha dos filtros

## Alteração

Mover o conteúdo da "Actions Row" (linhas 521-550) para dentro da "Filters Row" (linha 476), colocando o count de leads e o botão Exportar no final da mesma linha dos selects de filtro, com um `flex-1` separando.

### Arquivo: `src/pages/CRM.tsx`

- Remover o bloco "Actions Row" separado (linhas 521-550)
- Dentro da div de filtros (linha 476), após o último `Select`, adicionar:
  - O botão "Limpar Filtros" (condicional)
  - Um `flex-1` spacer
  - O texto `{filteredLeads.length} leads`
  - O botão "Exportar"
- Tudo ficará em uma única linha com scroll horizontal se necessário

