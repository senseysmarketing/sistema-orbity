

# Hard Delete de Registros Cancelados no Fluxo de Caixa

## Resumo
Adicionar botão "Excluir Registro" no menu de contexto (apenas para itens CANCELLED), com AlertDialog de confirmação e deleção permanente via Supabase client.

## Alterações

### 1. `src/components/admin/CommandCenter/CashFlowTable.tsx`

- Importar `Trash2` do lucide-react e `useQueryClient` do @tanstack/react-query
- Adicionar estado `deleteDialogItem` (similar ao `cancelDialogItem` existente)
- Adicionar estado `isDeletingItem` para loading
- Criar função `handleConfirmDelete` que:
  - Mapeia `sourceType` para tabela: `client_payment` → `client_payments`, `expense` → `expenses`, `salary` → `salaries`
  - Executa `supabase.from(table).delete().eq('id', item.sourceId)`
  - Em sucesso: toast de sucesso + `queryClient.invalidateQueries()` para refresh
  - Em erro: toast destructive
- No DropdownMenu, após o item "Cancelar / Perdoar", adicionar:
  ```
  {item.status === 'CANCELLED' && (
    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialogItem(item)}>
      <Trash2 /> Excluir Registro
    </DropdownMenuItem>
  )}
  ```
- Adicionar novo AlertDialog para confirmação de exclusão (título: "Excluir permanentemente?", descrição sobre irreversibilidade, botões "Cancelar" e "Sim, excluir")

### Nenhuma migration necessária
A deleção usa o Supabase client direto com as tabelas existentes. O `sourceId` já contém o ID original do registro.

## Arquivos alterados
- `src/components/admin/CommandCenter/CashFlowTable.tsx` (único arquivo)

