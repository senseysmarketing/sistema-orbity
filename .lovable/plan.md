
# Adicionar Upsell/Downsell + Pausa de Contrato ao PaymentSheet

## Alteracoes em `src/components/admin/PaymentSheet.tsx`

### 1. Switch "Tornar novo valor fixo mensal" (Upsell/Downsell)
- Adicionar state `updateContract` (boolean, default false)
- Abaixo do card "Valor Total da Fatura" (linha ~259), renderizar um bloco com `<Switch>` + label + tooltip (icone `HelpCircle`)
- Visivel apenas quando `totalAmount !== baseValue` (so faz sentido se o valor mudou)
- Label: "Tornar este o novo valor fixo mensal"
- Sub-label: "Atualiza o contrato do cliente para os proximos meses"
- Tooltip: "Ao ativar, o valor base mensal do cliente sera atualizado permanentemente. As faturas dos proximos meses serao geradas com este novo valor."

**Mutacao no handleSubmit:** Se `updateContract === true`, apos salvar o `client_payments`, fazer `supabase.from("clients").update({ monthly_value: totalAmount }).eq("id", clientId)`

### 2. Checkbox "Inativar cliente" no AlertDialog de cancelamento
- Adicionar state `deactivateClient` (boolean, default false)
- No corpo do AlertDialog (linha ~338), adicionar `<Checkbox>` com label "Tambem inativar este cliente (Pausar contrato)"
- Tooltip: "O cliente sera marcado como inativo e novas cobranças não serao geradas nos proximos meses."

**Mutacao no handleCancelPayment:** Se `deactivateClient === true`, apos cancelar o payment, fazer `supabase.from("clients").update({ active: false }).eq("id", clientId)`

### 3. Imports adicionais
- `Switch` de `@/components/ui/switch`
- `Checkbox` de `@/components/ui/checkbox`
- `Tooltip, TooltipContent, TooltipProvider, TooltipTrigger` de `@/components/ui/tooltip`
- `HelpCircle` de `lucide-react`

## Arquivo modificado
- `src/components/admin/PaymentSheet.tsx`

Nenhuma migracao SQL necessaria — `clients.monthly_value` e `clients.active` ja existem.
