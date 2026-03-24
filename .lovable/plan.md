

# SalarySheet + Limpeza de UI

## Verificacoes confirmadas

- **`employees.is_active`**: boolean, ja existe. Usar `is_active: false` para desligamento.
- **`salaries.description`**: NAO existe. Precisa migracao para adicionar coluna.
- **`salaries.amount`**: recebera o salario liquido (base + bonus - descontos).

## Alteracoes

### 1. Migracao SQL — adicionar coluna `description` em `salaries`
```sql
ALTER TABLE salaries ADD COLUMN description text;
```

### 2. Criar `src/components/admin/SalarySheet.tsx`
Sheet lateral com:
- Funcionario (Select, disabled em modo edicao)
- Salario Base (Input disabled, de `employees.base_salary`)
- Bonus / Comissoes (Input moeda, default 0)
- Descontos / Faltas (Input moeda, default 0)
- Salario Liquido calculado: `base + bonus - descontos` (salvo em `amount`)
- Data de Vencimento, Data de Pagamento (se paid), Status
- Observacoes da Folha (Textarea → `salaries.description`)
- Switch "Atualizar Salario Base" (visivel se liquido != base) → UPDATE `employees.base_salary`
- Botao "Cancelar Pagamento" (destructive) → AlertDialog com Checkbox "Desligar funcionario" → `employees.is_active = false`

### 3. Editar `TeamSection.tsx`
- Remover props: `onGenerateSalaries`, `onRunClosure`, `generatingSalaries`, `runningClosure`
- Remover botoes "Gerar Salarios" e "Fechamento Mensal"
- Manter apenas "Novo Funcionario"

### 4. Editar `Admin.tsx`
- Substituir `SalaryForm` por `SalarySheet`
- Passar `employees={metrics.employees}` para resolver salario base
- Remover states e handlers de `generateSalaries` e `runClosure`
- Remover props correspondentes do TeamSection

### 5. Atualizar tipo `Salary` em `useFinancialMetrics.tsx`
- Adicionar `description?: string | null`

## Arquivos
- **Migracao**: `ALTER TABLE salaries ADD COLUMN description text`
- **Criar**: `src/components/admin/SalarySheet.tsx`
- **Editar**: `src/components/admin/CommandCenter/TeamSection.tsx`
- **Editar**: `src/pages/Admin.tsx`
- **Editar**: `src/hooks/useFinancialMetrics.tsx`

