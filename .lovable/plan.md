

# Refatorar PaymentForm → Sheet Avancado de Gestao de Fatura

## Resumo
Substituir o `PaymentForm` (Dialog) por um novo componente `PaymentSheet` (Sheet lateral) com calculo dinamico de fatura, acao de cancelamento inteligente e botao preparatorio de cobranca WhatsApp.

## Alteracoes

### 1. Novo componente `src/components/admin/PaymentSheet.tsx`
Substituir completamente o PaymentForm por um Sheet lateral com:

**Layout do Sheet:**
- `SheetHeader`: titulo "Fatura do Mes" + nome do cliente + badge de status (PENDING/OVERDUE/PAID/CANCELLED)
- `SheetContent` com scroll interno

**Campos do formulario:**
- **Cliente** (Select ou Input disabled se preselectedClient) — mesmo comportamento atual
- **Valor Base do Contrato** — Input disabled, valor `monthly_value` do cliente (somente leitura)
- **Acrescimos / Multa** — Input numerico opcional, default 0
- **Descontos** — Input numerico opcional, default 0
- **Valor Total da Fatura** — campo calculado em tempo real: `baseValue + additions - discounts`. Exibido como texto grande/bold, nao editavel. Este valor sera salvo no `amount` do `client_payments`
- **Data de Vencimento** — date input
- **Data de Pagamento** — date input (visivel apenas se status === 'paid')
- **Status** — Select (pending, paid, overdue)
- **Observacoes da Fatura** — Textarea, salvo no campo `description` (ja existe na tabela)

**Inicializacao em modo edicao:**
- `baseValue` = valor do contrato mestre do cliente (buscar em `metrics.clients`)
- `additions` = `payment.amount - baseValue` se positivo, senao 0
- `discounts` = `baseValue - payment.amount` se positivo, senao 0
- Ou simplesmente: mostrar o `amount` atual e permitir ajuste via additions/discounts

**Acoes no footer:**
- Botao "Salvar" — muta `client_payments` com `amount = baseValue + additions - discounts`
- Botao "Cancelar" (outline) — fecha o sheet
- Botao "Cancelar Cobranca" (destructive, icone Ban) — visivel apenas em modo edicao. Abre AlertDialog: "Deseja cancelar esta cobranca? O cliente nao sera cobrado neste mes." → muta status para `cancelled`
- Botao "Enviar Cobranca via WhatsApp" (outline, icone MessageSquare) — visivel se status === 'pending' ou 'overdue'. Por enquanto, exibe toast "Em breve: integracao com WhatsApp"

**Loading:** Skeleton enquanto clients nao carregaram

### 2. `src/pages/Admin.tsx` — Trocar PaymentForm por PaymentSheet
- Substituir import e uso de `<PaymentForm>` por `<PaymentSheet>`
- Passar `clients={metrics.clients}` como prop para o Sheet resolver o `baseValue`
- `onSuccess` continua chamando `metrics.refetchAll()`

### 3. Nao precisa de migracao SQL
O campo `description` ja existe em `client_payments` e sera usado para as observacoes.

## Arquivos
- **Criar**: `src/components/admin/PaymentSheet.tsx`
- **Editar**: `src/pages/Admin.tsx` (trocar PaymentForm por PaymentSheet)
- **Manter**: `src/components/admin/PaymentForm.tsx` (nao deletar, pode ser usado em outros contextos)

