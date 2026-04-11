

# Correção de Duplicação na Central de Despesas

## Diagnóstico

Analisei os dados no banco e o código atual. Resultado:

1. **Aba "SaaS Tracker" (Assinaturas)**: A query JÁ possui `.is('parent_expense_id', null)` (linha 257). Existem 22 mestres únicos no banco. As duplicações visíveis no screenshot são do estado anterior ao deploy — código atual está correto.

2. **Aba "Parcelamentos"** (BUG CONFIRMADO): A query busca TODOS os registros `parcelada` sem filtrar por `parent_expense_id IS NULL`. Resultado: "Escola Jonas (Mentoria)" aparece 10x (cada parcela individual), quando deveria aparecer 1x como card mestre com barra de progresso agregada.

3. **Aba "Contas do Mês"**: Alimentada pelo `cashFlow` do `useFinancialMetrics`, que já filtra por `startDate/endDate` (linhas 182-183). Está correto — só mostra despesas com `due_date` no mês selecionado.

4. **Totais de despesas**: O cálculo em `useFinancialMetrics` (linha 258-260) já respeita o filtro de data. Porém, inclui a parcela mestre (installment 1) que tem `due_date` no mês — isso está correto pois ela É a conta do mês.

## Correções

### Arquivo: `AdvancedExpenseSheet.tsx`

**Aba Parcelamentos** (linhas 310-323):
- Alterar query para buscar apenas mestres: adicionar `.is('parent_expense_id', null)`
- Para cada mestre, fazer uma sub-query ou buscar filhos para calcular progresso real
- Abordagem: buscar mestres e contar parcelas pagas via query separada nos filhos

**Nova lógica do card de parcelamento**:
- Buscar mestres (`parent_expense_id IS NULL, expense_type = 'parcelada'`)
- Para cada mestre, buscar contagem de filhos pagos via query agregada
- Calcular progresso: `parcelas_pagas / installment_total`
- Mostrar valor total (`amount * installment_total`) e valor da parcela
- Filtrar apenas parcelamentos com parcelas restantes

### Arquivo: `useFinancialMetrics.tsx`

Sem alterações necessárias — a query de despesas já filtra por data e os totais estão corretos.

### Arquivo: `ExpenseForm.tsx`

Sem alterações necessárias — a criação já implementa corretamente o padrão parent/child (mestre com `parent_expense_id = null`, filhos apontando para o mestre).

## Resumo de alterações
- 1 arquivo modificado: `AdvancedExpenseSheet.tsx`
- Corrigir query de parcelamentos para mostrar apenas mestres com progresso agregado
- Nenhuma migration necessária

