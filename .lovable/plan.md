## Objetivo

Separar **Razão Social** (nome formal/jurídico usado nos gateways e NF) de **Nome Fantasia** (nome de exibição, editável livremente no Orbity). Nome fantasia é priorizado na UI; razão social é priorizada no envio aos gateways.

## Modelo de dados

Adicionar 1 coluna à tabela `clients`:

- `legal_name text` — Razão Social (nome formal, enviado aos gateways).

Manter a coluna `name` existente como **Nome de Exibição / Fantasia** (é assim que o Orbity já usa em toda a UI, cards, tarefas, dashboard, planejamento, etc.). Isso evita reescrever dezenas de componentes.

Migration:
- `ALTER TABLE clients ADD COLUMN legal_name text;`
- Backfill: `UPDATE clients SET legal_name = name WHERE legal_name IS NULL;` (mantém cobranças atuais funcionando — razão social herda o nome atual como fallback).
- Sem novas policies/grants (coluna nova em tabela existente).

## Formulário de cliente (`src/components/admin/ClientForm.tsx`)

Bloco "Dados Principais" reorganizado:

1. **CPF/CNPJ*** (mantém auto-fetch BrasilAPI).
2. **Razão Social*** (`legal_name`) — obrigatória, usada nos gateways/NF.
3. **Nome Fantasia** (`name`) — opcional, se vazio no submit cai automaticamente para `legal_name`. Helper: "Nome usado no Orbity. Se vazio, usaremos a Razão Social."
4. Status, e-mail de faturamento, contato… (inalterados).

**Auto-fetch CNPJ** (`fetchCnpjData`): passa a preencher:
- `legal_name` ← `data.razao_social`
- `name` ← `data.nome_fantasia || data.razao_social` (mantém comportamento atual)

Validação: `legal_name` obrigatório quando `document` for CNPJ (14 dígitos). Para CPF, `legal_name` = `name` automaticamente (pessoa física não tem razão social).

## Gateways (envio da cobrança)

Trocar `client.name` por `client.legal_name || client.name` nos pontos que representam o **titular formal** da cobrança:

- `supabase/functions/create-gateway-charge/index.ts`: `.select()` inclui `legal_name`; `buildAsaasCustomerPayload` e o payload Conexa passam a usar `legal_name || name`.
- `supabase/functions/_shared/conexa-client.ts` (`upsertConexaCustomer` / `createConexaSale`): mesmo tratamento onde o nome do cliente é enviado ao Conexa.
- `supabase/functions/create-agency-stripe-charge/index.ts`: `customer.name` e `product_data.name` passam a usar `legal_name || name`. A `description` (log interno) pode continuar com o `name` de exibição.
- `supabase/functions/invoice-conexa-sale/index.ts`: mesmo padrão.

Não altero webhooks/reconciliação (leem por ID, não por nome).

## Variáveis de template de cobrança

Em `src/lib/billing-utils.ts` e `supabase/functions/process-billing-reminders/index.ts`:

- `{cliente}` / `{nome}` — continuam retornando **Nome Fantasia** (`client.name`). Compatível com todos os templates atuais.
- **Novas variáveis**:
  - `{razao_social}` → `client.legal_name || client.name`
  - `{nome_fantasia}` → `client.name`

Documentar as duas novas variáveis no seletor/lista de variáveis disponíveis (onde já existe UI de ajuda de variáveis).

## UI complementar

- `ClientOverview.tsx`: exibir Razão Social em cinza abaixo do nome fantasia quando forem diferentes.
- Listagem de clientes (Portfolio/Carteira): sem mudanças — continua mostrando `name` (fantasia).
- Fluxo de Caixa / Cobranças: continua mostrando `client.name` (fantasia) — a razão social só aparece no gateway e na NF.

## Compatibilidade

- Clientes existentes: backfill garante `legal_name = name`, então cobranças continuam idênticas até o usuário editar.
- Templates existentes: `{cliente}` mantém o mesmo valor de antes.
- Nenhuma alteração em Asaas customer IDs / Conexa sale IDs já persistidos.

## Arquivos tocados

- **Migration nova** — adiciona `legal_name` + backfill.
- `src/components/admin/ClientForm.tsx` — campo Razão Social + fetch CNPJ atualizado + fallback no submit.
- `src/components/clients/ClientOverview.tsx` — exibe razão social quando diferente.
- `src/lib/billing-utils.ts` — novas variáveis `{razao_social}` e `{nome_fantasia}`.
- `supabase/functions/process-billing-reminders/index.ts` — passa `legal_name` ao renderer.
- `supabase/functions/create-gateway-charge/index.ts` — usa `legal_name || name` nos payloads Asaas/Conexa.
- `supabase/functions/_shared/conexa-client.ts` — usa `legal_name || name` no upsert de cliente Conexa.
- `supabase/functions/create-agency-stripe-charge/index.ts` — usa `legal_name || name` no customer/product Stripe.
- `supabase/functions/invoice-conexa-sale/index.ts` — usa `legal_name || name`.

Aprove para implementar.
