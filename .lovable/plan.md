

# Ajustes visuais no Centro de Comando

## Alteracoes

### 1. `CashFlowTable.tsx` — Adicionar barra de pesquisa
- Adicionar um `<Input>` com icone de `Search` entre o titulo "Fluxo de Caixa" e os botoes de filtro de periodo
- Layout: titulo à esquerda, input de busca centralizado, botoes de periodo à direita
- Filtrar `filtered` pelo termo de busca (match no `item.title`)

### 2. `FloatingActionBar.tsx` — Corrigir estilo do botao "Novo Cliente" e header
- Mudar `variant="create"` para `variant="outline"` no botao "Novo Cliente" (mesmo estilo dos outros botoes)
- Remover `border-b` da div container para eliminar a linha divisoria abaixo do titulo/subtitulo

### Arquivos
- `src/components/admin/CommandCenter/CashFlowTable.tsx`
- `src/components/admin/CommandCenter/FloatingActionBar.tsx`

