

# Edição Inteligente de Despesas — Raiz vs Galho (com Blindagens Matemáticas)

## Resumo
Implementar lógica de edição diferenciada para registros Mestre (cascata para pendentes) vs Filho (edição pontual), com correções matemáticas para parcelamentos e alertas contextuais na UI.

## Alterações no `ExpenseForm.tsx` (único arquivo)

### 1. Variáveis de contexto (início do componente)
```ts
const isMaster = expense && !expense.parent_expense_id && 
  (expense.expense_type === 'recorrente' || expense.expense_type === 'parcelada');
const isChild = expense && !!expense.parent_expense_id;
```

### 2. Alertas contextuais na UI (após DialogDescription)
- **Se `isMaster`**: Alert azul informativo:
  - "Você está editando as regras desta assinatura/parcelamento. As alterações afetarão os próximos lançamentos e faturas pendentes. Faturas já pagas não serão alteradas."
  - Nota adicional: "Mudanças no dia de vencimento se aplicarão apenas às faturas geradas a partir do próximo mês."
- **Se `isChild`**: Alert amarelo (warning):
  - "Você está editando apenas a fatura deste mês. Para alterar o valor fixo ou cancelar, edite a assinatura na aba 'Assinaturas Ativas'."

### 3. Mutação cascata no handleSubmit (seção de edição, linhas 190-201)

Após o UPDATE do registro Mestre, se `isMaster`:

**Blindagem 1 — Valor correto para filhos:**
```ts
const childAmount = expense.expense_type === 'parcelada'
  ? parseFloat(formData.installment_amount)
  : baseData.amount;
```

**Blindagem 2 — Salvar installment_amount no Mestre:**
Para parceladas, incluir no baseData do Mestre: `installment_amount` (caso o campo exista) ou garantir que `amount` reflita o valor da parcela (já é o caso na lógica atual da linha 165).

**UPDATE cascata nos filhos pendentes:**
```ts
await supabase
  .from('expenses')
  .update({
    name: baseData.name,
    amount: childAmount,
    base_value: baseData.base_value,
    category: baseData.category,
    description: baseData.description,
    currency: baseData.currency,
    exchange_rate: baseData.exchange_rate,
  })
  .eq('parent_expense_id', expense.id)
  .eq('status', 'pending');
```

**Toast diferenciado:**
- Mestre: "Assinatura e faturas pendentes atualizadas!"
- Filho: "Fatura do mês atualizada."

### 4. Bloqueio de tipo (já implementado)
Linha 298 já tem `disabled={!!expense}`. Nenhuma alteração necessária.

## Arquivos modificados
- `src/components/admin/ExpenseForm.tsx` (único arquivo)

## Sem migration
Nenhuma alteração de schema necessária.

