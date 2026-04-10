

# Campos de Faturamento no Cliente (CPF/CNPJ + Endereço + ViaCEP)

## Resumo
Adicionar campos de faturamento (documento e endereço) à tabela `clients`, ao formulário de cadastro/edição com auto-preenchimento via ViaCEP, e à visualização do cliente.

## 1. Migration — Novos campos na tabela `clients`

Os campos `document`, `zip_code`, `street`, `number`, `complement`, `neighborhood`, `city`, `state` não existem. Criar migration:

```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS document TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS street TEXT,
  ADD COLUMN IF NOT EXISTS number TEXT,
  ADD COLUMN IF NOT EXISTS complement TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;
```

Todos nullable — sem obrigatoriedade.

## 2. ClientForm.tsx — Seção "Dados de Faturamento"

- Adicionar ao `formData`: `document`, `zip_code`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`
- Carregar valores existentes no `useEffect` de edição
- Incluir no `handleSubmit` os novos campos no objeto `data`
- Adicionar separador visual (`<Separator />` + título "Dados de Faturamento") após a seção atual
- Campos:
  - **CPF/CNPJ** — input com máscara (formatação visual: `000.000.000-00` para CPF, `00.000.000/0001-00` para CNPJ, baseado no length)
  - **CEP** — input com máscara `00000-000` e `onBlur` que chama ViaCEP quando 8 dígitos
  - **Rua**, **Número**, **Complemento** — grid 3 colunas
  - **Bairro**, **Cidade**, **Estado** — grid 3 colunas
- Função `fetchAddressByCep`: fetch `https://viacep.com.br/ws/${cep}/json/`, preenche `street`, `neighborhood`, `city`, `state` automaticamente
- Resetar esses campos no reset do form

## 3. ClientDetailsDialog.tsx — Exibir dados de faturamento

- Adicionar campos ao interface `Client`
- Na aba "Informações", adicionar seção "Dados de Faturamento" com:
  - CPF/CNPJ formatado
  - Endereço completo em uma linha (Rua, Nº - Complemento, Bairro - Cidade/UF, CEP)
  - Se nenhum campo preenchido, mostrar texto: "Dados de faturamento não cadastrados"

## 4. ClientOverview.tsx — Card de faturamento

- Na página de detalhe do cliente (`ClientDetail`), adicionar card "Dados de Faturamento" na grid `lg:grid-cols-2` ao lado de "Próximas Reuniões"
- Exibir documento e endereço formatados
- Badge de alerta se documento estiver vazio: "CPF/CNPJ pendente"

## Arquivos modificados (4)
- Migration SQL (novo)
- `src/components/admin/ClientForm.tsx`
- `src/components/admin/ClientDetailsDialog.tsx`
- `src/components/clients/ClientOverview.tsx`

