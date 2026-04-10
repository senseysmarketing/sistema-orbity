

# Auditoria Financeira: Taxas, Valores Pagos, Pre-Flight e Trava de Exclusão (Revisado)

## Ponto 1 — ClientForm.tsx: JA IMPLEMENTADO
O formulário ja possui campos `document`, `zip_code`, `street`, etc., com mascara e ViaCEP `onBlur`. Nenhuma alteracao necessaria.

## Ponto 2 — Nomenclatura confirmada
A coluna se chama `amount` (nao `value`). Portanto o calculo sera `p.amount_paid || p.amount`.

---

## Implementacao

### 1. Migration SQL — Novas colunas

```sql
ALTER TABLE public.client_payments
  ADD COLUMN IF NOT EXISTS gateway_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC;
```

### 2. useFinancialMetrics.tsx — Tipos e calculos

- Adicionar `gateway_fee` e `amount_paid` a interface `ClientPayment`
- Adicionar `document`, `zip_code`, `asaas_customer_id`, `conexa_customer_id` a interface `Client` e ao `.select()` do clients query (linha 142)
- Nos calculos de receita (pagamentos paid no cashFlow), usar `p.amount_paid || p.amount`
- Exportar `totalGatewayFees`: soma de `gateway_fee` dos pagamentos paid no mes
- Exportar `totalNetRevenue`: receita recebida menos taxas

### 3. PaymentSheet.tsx — Pre-Flight Check nos botoes de gateway

- Nos botoes "Gerar Cobranca (Asaas)" (linha 404) e "Gerar Cobranca (Conexa)" (linha 437):
  - Se `!resolvedClient?.document || !resolvedClient?.zip_code`, botao fica `disabled`
  - Envolver com `<TooltipProvider>/<Tooltip>` com mensagem: "Dados de faturamento incompletos. Preencha o CPF/CNPJ e CEP do cliente."

### 4. PaymentSheet.tsx — Transparencia visual no detalhe (NOVO)

- Quando `isEditing && status === 'paid'` e existirem dados de `gateway_fee > 0` ou `amount_paid !== amount`:
  - Exibir bloco somente-leitura apos o status badge:
    - "Valor Original: R$ X"
    - "Valor Pago: R$ Y" (se `amount_paid` diferente)
    - "Taxa do Gateway: R$ Z" (se `gateway_fee > 0`)
    - "Liquido: R$ (amount_paid - gateway_fee)"
  - Usar fundo `bg-muted/50` com bordas arredondadas

### 5. ClientDetailsDialog.tsx — Trava de exclusao com confirmacao dupla

- Adicionar `asaas_customer_id` e `conexa_customer_id` a interface `Client` (linhas 13-34)
- No AlertDialog de exclusao (linhas 376-402):
  - Se `client.asaas_customer_id || client.conexa_customer_id`:
    - Exibir `<Alert variant="destructive">` com aviso sobre assinaturas ativas no gateway
    - Adicionar `<Input>` para digitar o nome do cliente
    - Botao "Excluir" so habilita quando texto === `client.name`
  - Novo state: `deleteConfirmName`

## Arquivos modificados (4)
- Migration SQL (novo)
- `src/hooks/useFinancialMetrics.tsx`
- `src/components/admin/PaymentSheet.tsx`
- `src/components/admin/ClientDetailsDialog.tsx`

