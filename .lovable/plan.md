

# Conectar SalarySheet ao TeamSection + Alinhar Botoes

## Problema
O botao "Editar" no sheet "Gerenciar Equipe" chama `onEditEmployee` que abre o `EmployeeForm` (modal antigo de dados cadastrais). O usuario espera abrir o `SalarySheet` para editar o salario do mes atual.

## Alteracoes

### 1. `TeamSection.tsx` — Nova prop + alinhamento visual
- Adicionar prop `onEditSalaryByEmployee: (employee: Employee) => void`
- O botao "Editar" no sheet interno passara a chamar `onEditSalaryByEmployee(emp)` em vez de `onEditEmployee(emp)`
- Alinhar botoes "Editar" e "Ativar/Desativar" com layout consistente (mesma largura, `variant="ghost"` uniforme)

### 2. `Admin.tsx` — Novo handler + wiring
- Criar `handleEditSalaryByEmployee(employee)`:
  1. Busca em `metrics.salaries` o salario do mes atual para esse `employee_id`
  2. Se encontrar: `setSelectedSalary(salary); setSalaryFormOpen(true)`
  3. Se nao encontrar: abre o SalarySheet sem salary (modo criacao) pre-selecionando o employee
- Passar esse handler como prop `onEditSalaryByEmployee` no `TeamSection`

### 3. Alinhamento visual dos botoes no TeamSection sheet
- Usar `flex items-center gap-2` nos botoes "Editar" e "Ativar/Desativar" com tamanho consistente

## Arquivos
- `src/components/admin/CommandCenter/TeamSection.tsx`
- `src/pages/Admin.tsx`

