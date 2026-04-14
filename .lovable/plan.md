

# Enriquecer payload POST /customer do Conexa

## Alterações

### Arquivo: `supabase/functions/create-gateway-charge/index.ts`

**1. Expandir SELECT de clients** (linha ~304):
Adicionar campos de endereço e contato:
```
"id, name, email, document, contact, asaas_customer_id, conexa_customer_id, zip_code, street, number, neighborhood, city, state, complement"
```

**2. Reescrever `ensureConexaCustomer`** (linhas 105-147):

Expandir assinatura do parâmetro `client` para incluir todos os campos (email, document, contact, zip_code, street, number, neighborhood, city, state, complement, conexa_customer_id).

Substituir o payload simples `{ companyId, name }` pela lógica completa:

- **Telefone**: limpar não-dígitos, remover DDI 55 se >11 dígitos, truncar para últimos 11 dígitos
- **Endereço**: montar objeto `address` somente se `zip_code` existir, com `additionalDetails` mapeado de `complement`
- **Documento**: roteamento dinâmico — se >11 dígitos vai para `legalPerson.cnpj`, senão `naturalPerson.cpf`
- **Emails**: `emailsFinancialMessages` e `emailsMessage` como arrays com o email do cliente

**3. Deploy** da edge function `create-gateway-charge`.

## Resumo
- 1 arquivo alterado (`create-gateway-charge/index.ts`)
- 2 pontos de edição: SELECT dos clients + função `ensureConexaCustomer`
- 0 migrations

