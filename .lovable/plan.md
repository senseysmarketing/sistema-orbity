

# Juros, Multa e Descontos — Plano Completo

## Resumo
Adicionar configuracao visual de regras financeiras (multa, juros, desconto) no painel da agencia, exibir diferencas de valor em pagamentos concluidos, e acoplar essas regras ao payload de criacao de cobrancas.

## Alteracoes

### 1. `src/hooks/usePaymentGateway.tsx`
- Adicionar 4 campos a interface `PaymentSettings`: `default_fine_percentage`, `default_interest_percentage`, `discount_percentage`, `discount_days_before`
- Adicionar defaults correspondentes em `defaultSettings`

### 2. `src/components/admin/BillingAutomationSettings.tsx`
- Remover os 4 novos campos do `Omit` no type `FormData`
- Adicionar ao `defaultFormData` e ao `useEffect` de sincronizacao
- Nova secao "Juros, Multas e Descontos" com `Card` contendo 4 inputs numericos com tooltips:
  - Multa por Atraso (%)
  - Juros de Mora (% ao mes)
  - Desconto Pontualidade (%)
  - Dias limite para desconto
- Incluir `handleSave` para persistir esses campos

### 3. `src/components/admin/PaymentSheet.tsx`
- No bloco "Detalhes do Recebimento" (linhas ~420-451), adicionar linhas contextuais:
  - Se `amount_paid > amount`: linha verde `"+ R$ X recebidos em juros/multa"`
  - Se `amount_paid < amount`: linha amarela `"- R$ X concedidos em desconto"`

### 4. Acoplamento na emissao — `src/hooks/useCreatePayment.ts`
- Importar `usePaymentGateway` para ler as regras financeiras da agencia
- Incluir no payload de `createPayment` os campos `fine_percentage`, `interest_percentage`, `discount_percentage`, `discount_days_before` para que fiquem persistidos ou disponiveis
- Adicionar comentario TODO no codigo indicando que, quando a Edge Function de emissao para Asaas/Conexa for implementada, ela devera:
  1. Buscar `agency_payment_settings` da agencia
  2. Montar o objeto `fine`, `interest` e `discount` conforme documentacao do gateway
  3. Injetar no JSON enviado a API

### 5. `src/components/admin/FirstPaymentDialog.tsx`
- Mesmo acoplamento: passar as regras financeiras via `usePaymentGateway` para o `createPayment`, garantindo que o fluxo fast-track tambem carregue as regras

## Arquivos
- `src/hooks/usePaymentGateway.tsx`
- `src/components/admin/BillingAutomationSettings.tsx`
- `src/components/admin/PaymentSheet.tsx`
- `src/hooks/useCreatePayment.ts`
- `src/components/admin/FirstPaymentDialog.tsx`

## Nenhuma migration necessaria
As colunas ja existem no banco (migration anterior executada com sucesso).

