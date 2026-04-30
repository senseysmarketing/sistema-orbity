## Bug

O modal "Enviar Cobrança Manual" mostra **"Este cliente não possui telefone cadastrado"** mesmo quando o cliente tem o campo "Contato (WhatsApp)" preenchido (ex.: EOS Imóveis com `(15) 99695-4016`).

## Causa raiz

Em `src/hooks/useFinancialMetrics.tsx`, dois pontos quebram a leitura do telefone:

1. **Linha 162** — o `select` da query `clients` **não inclui a coluna `phone`** (e o campo "Contato (WhatsApp)" do formulário grava em `contact`, não em `phone`).
2. **Linhas 527 e 690** — o mapeamento usa `(client as any).phone ?? null`, que sempre retorna `null` porque:
   - a coluna `phone` não foi selecionada, e
   - o telefone real do WhatsApp do cliente vive em `contact` (confirmado em `ClientForm.tsx` linha 441 e `ClientOverview.tsx`).

Resultado: `clientPhone` chega como `null` no `ManualBillingDialog`, disparando o aviso amarelo e bloqueando o envio.

## Correção

### 1. `src/hooks/useFinancialMetrics.tsx` — incluir `phone` no select (defensivo, caso algum cliente legado use)

Linha 162:

```ts
.select('id, name, monthly_value, active, start_date, contact, phone, service, ...')
```

### 2. `src/hooks/useFinancialMetrics.tsx` — preferir `contact` (campo oficial do form) com fallback para `phone`

Linhas 527 e 690 — trocar:

```ts
clientPhone: (client as any).phone ?? null,
```

por:

```ts
clientPhone: (client as any).contact ?? (client as any).phone ?? null,
```

## Por que essa ordem (`contact` antes de `phone`)

- O formulário de cliente (`ClientForm.tsx` linha 441) rotula o campo como **"Contato (WhatsApp) *"** e persiste em `contact` — é o campo que o usuário entende como "telefone para cobrança".
- `phone` existe na tabela mas não é exposto no formulário visto pelo admin nesse fluxo; mantemos como fallback para compatibilidade com dados importados/legados.

## Arquivos afetados

- **Editado**: `src/hooks/useFinancialMetrics.tsx` (3 linhas: 162, 527, 690)

## Fora do escopo

- Higienização do telefone (`replace(/\D/g,'')`) — já está implementada no `ManualBillingDialog` via Guardrail 4, então máscaras como `(15) 99695-4016` continuam sendo aceitas automaticamente após o fix.
- Migração para unificar `contact` e `phone` em uma única coluna — mudança maior, fora do escopo deste bugfix.
