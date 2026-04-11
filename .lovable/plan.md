

# Adicionar Botão de Excluir Parcelamentos

## Resumo
Adicionar um ícone de lixeira (Trash2) nos cards de parcelamentos que cancela apenas as parcelas pendentes, preservando as já pagas.

## Alterações no `AdvancedExpenseSheet.tsx`

1. **Import**: Adicionar `Trash2` do lucide-react.

2. **Mutation de exclusão**: Criar `deleteInstallmentMutation` que:
   - Recebe o `masterId`
   - Faz `UPDATE` nos filhos pendentes: `.update({ status: 'paid' })` → NÃO. Faz **DELETE** nos filhos com `status = 'pending'` e `parent_expense_id = masterId`
   - Também deleta o mestre se ele próprio estiver pendente, OU atualiza seu `status` para `canceled`
   - Abordagem mais segura: marcar como `canceled` (não deletar fisicamente) tanto o mestre quanto os filhos pendentes

   ```ts
   // Cancelar filhos pendentes
   await supabase.from('expenses')
     .update({ status: 'canceled' })
     .eq('parent_expense_id', masterId)
     .eq('status', 'pending');
   
   // Cancelar o mestre
   await supabase.from('expenses')
     .update({ status: 'canceled' })
     .eq('id', masterId);
   ```

3. **UI**: Adicionar botão `Trash2` ao lado do `Pencil` nos cards de parcelamento, com `confirm()` antes de executar.

4. **Toast**: "Parcelamento cancelado. Parcelas já pagas foram preservadas."

5. **Invalidação**: Invalidar queries `installment-expenses` e `financial-metrics`.

## Arquivos modificados
- `src/components/admin/CommandCenter/AdvancedExpenseSheet.tsx` (único arquivo)

