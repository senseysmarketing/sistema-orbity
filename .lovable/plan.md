

# Correção Conexa: Payload Flat sem companyId no /sale

## Alterações

### 1. Migration SQL
Adicionar coluna `conexa_unit_id` (INTEGER) à tabela `agency_payment_settings`.

### 2. `src/components/settings/ConexaIntegration.tsx`
- Novo state `unitId`, carregado de `settings.conexa_unit_id`
- Novo campo "ID da Unidade (Conexa)" com dica: "Encontrado em Config > Unidades > Ações > Exibir no painel Conexa"
- Salvar `conexa_unit_id` no `handleSave`

### 3. `supabase/functions/create-gateway-charge/index.ts`

**Validação** (bloco conexa, após linha 314): Adicionar check para `conexa_unit_id`:
```typescript
if (!settings.conexa_unit_id) {
  return jsonResponse({ error: "ID da Unidade do Conexa não configurado..." }, 422);
}
```

**`ensureConexaCustomer`** (linha 120-123): Payload mínimo com `companyId` (= `unitId`) + `name` apenas:
```typescript
const payload = {
  companyId: normalizedCompanyId,
  name: client.name,
};
```
Já está assim — sem mudança necessária. Apenas trocar o parâmetro chamado na invocação (linha 325) de `settings.conexa_company_id` para `settings.conexa_unit_id`.

**`createConexaSale`** (linhas 150-188): Refatorar completamente:
- Remover parâmetro `companyId` da assinatura
- Payload flat **SEM `companyId`**, **SEM `items[]`**:
```typescript
const body: Record<string, unknown> = {
  customerId: parseInt(customerId, 10),
  productId,
  quantity: 1,
  amount,
  referenceDate: new Date().toISOString(),
  notes: _description || undefined,
};
```

**Chamada** (linhas 329-338): Remover o último argumento `settings.conexa_company_id`:
```typescript
const conexaResponse = await createConexaSale(
  conexaCustomerId, amount, due_date, description,
  settings.conexa_default_product_id,
  conexaBaseUrl, settings.conexa_api_key
);
```

**Error handling**: Na catch de `createConexaSale`, detectar mensagem de "product" + "company/unit" para retornar erro amigável sobre produto e unidade divergentes.

### 4. Deploy
Redeployar `create-gateway-charge`.

## Resumo das diferenças vs. plano anterior
- `companyId` **removido** do body de POST `/sale` (a API rejeita esse campo)
- `companyId` **mantido** apenas no POST `/customer` (usando `conexa_unit_id`)
- Campo `amount` em vez de `unitPrice` dentro de `items`
- Formato flat (sem array `items`)

