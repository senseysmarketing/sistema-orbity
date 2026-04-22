

# Reversão de Pagamento — CashFlowTable (versão final aprovada)

## Comportamento

Nova ação no `DropdownMenu` de cada linha, visível apenas quando `item.status === 'PAID'` e `!isForecastItem`.

### Manual (reversível no banco)
Critério: `item.type === 'EXPENSE'` **ou** `(item.type === 'INCOME' && (!item.billingType || item.billingType === 'manual'))`.

- Item: ícone `Undo2` + "Reverter para Pendente".
- Abre `<AlertDialog>` de confirmação ("Esta ação marcará o lançamento como Pendente e removerá a data de pagamento. Se a `due_date` já passou, voltará a aparecer como Atrasado automaticamente.").
- Confirmação dispara `handleRevertPayment(item)`:
  - `sourceType === 'expense'` → `UPDATE expenses SET status='pending', paid_at=null WHERE id=item.sourceId`
  - `sourceType === 'client_payment'` → `UPDATE client_payments SET status='pending', payment_date=null WHERE id=item.sourceId`
  - `sourceType === 'salary'` → `UPDATE salaries SET status='pending', paid_at=null WHERE id=item.sourceId`
- Apenas colunas que são preenchidas no momento do pagamento são anuladas — sem tocar em `amount_paid`, `paid_amount` ou outras que possam não existir no schema. Reset de status permite que a UI/cronjobs recalculem `overdue` a partir de `due_date`.
- `try/catch` com `toast` de sucesso/erro. Sucesso → `queryClient.invalidateQueries()` + `onRefetch?.()`.

### Gateway (bloqueio seguro — sem ação no banco)
Critério: `item.type === 'INCOME' && item.billingType && item.billingType !== 'manual'`.

- Item: ícone `ExternalLink` + "Estornar no Gateway".
- Abre `<AlertDialog>` informativo (Quiet Luxury, sem variante destrutiva):
  - **Título:** "Ação Externa Necessária"
  - **Mensagem:** "Este pagamento foi processado automaticamente via Gateway (Asaas/Conexa). Para evitar inconsistências no seu caixa, realize o estorno ou cancelamento diretamente no painel administrativo do Gateway. O Orbity será atualizado automaticamente assim que o estorno for confirmado via webhook."
  - **Botão primário:** "Entendido" (fecha).
  - **Botão secundário (admin login do gateway, NÃO `invoiceUrl`):**
    - `billingType === 'asaas'` → "Abrir Asaas" → `https://www.asaas.com/login`
    - `billingType === 'conexa'` → "Abrir Conexa" → `https://app.conexa.app/login`
    - Outro/desconhecido → omitir o botão secundário.
  - Abertura via `window.open(url, '_blank', 'noopener,noreferrer')`.

## Implementação técnica (`src/components/admin/CommandCenter/CashFlowTable.tsx`)

1. **Imports**: adicionar `Undo2` ao `lucide-react` (ExternalLink já está).
2. **Estado**:
   ```ts
   const [revertItem, setRevertItem] = useState<CashFlowItem | null>(null);
   const [gatewayInfoItem, setGatewayInfoItem] = useState<CashFlowItem | null>(null);
   const [isReverting, setIsReverting] = useState(false);
   ```
3. **Helpers**:
   ```ts
   const isGatewayIncome = (i: CashFlowItem) =>
     i.type === 'INCOME' && !!i.billingType && i.billingType !== 'manual';
   const gatewayAdminUrl = (bt?: string) =>
     bt === 'asaas' ? 'https://www.asaas.com/login'
     : bt === 'conexa' ? 'https://app.conexa.app/login'
     : null;
   ```
4. **`handleRevertPayment`**: switch por `sourceType` aplicando os UPDATEs estritos descritos acima; toast + invalidate + `onRefetch?.()`; `setIsReverting` flag.
5. **DropdownMenu** (após "Editar Detalhes", antes de "Cancelar"):
   - Se `item.status === 'PAID'` e `!isForecastItem`:
     - Se `isGatewayIncome(item)` → "Estornar no Gateway" → `setGatewayInfoItem(item)`.
     - Senão → "Reverter para Pendente" → `setRevertItem(item)`.
6. **Dois novos `<AlertDialog>`** ao lado dos existentes — estética Quiet Luxury (tipografia atual, sem cores destrutivas no aviso de gateway, `variant="outline"` no botão secundário, `disabled={isReverting}` no confirm da reversão).

## Não muda

- `useFinancialMetrics`, schemas, RLS, Edge Functions, webhooks, demais ações do menu.
- Itens em modo previsão continuam sem ações.

## Arquivos alterados

- `src/components/admin/CommandCenter/CashFlowTable.tsx` — único arquivo.

