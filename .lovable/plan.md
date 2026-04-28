## Diagnóstico

O bug está em `src/hooks/useFinancialMetrics.tsx`, no `useMemo` `unifiedCashFlow` (linha 497-552), que monta a **lista visual do Fluxo de Caixa** que o usuário está vendo no print.

Linha 503:
```ts
paymentsInMonth.forEach(p => {
  const client = clients.find(c => c.id === p.client_id);
  if (!client || !wasClientActiveInMonth(client, selectedMonth)) return; // ← BUG
  items.push({ ... });
});
```

A função `wasClientActiveInMonth` retorna `false` quando o cliente foi desativado e o `cancelled_at` está antes do final do mês. Isso filtra **inclusive os pagamentos com `status === 'paid'`** — ou seja, dinheiro que de fato entrou no caixa some da lista assim que o cliente é desligado.

Isso viola o princípio de imutabilidade do Fluxo de Caixa Real (que aprovamos no Offboarding): pagamento pago = histórico, não importa o status atual do cliente.

Confirmação no print: as 3 cobranças "Pago" do Cantinho da Prata (R$ 900, R$ 5, R$ 10) sumiram após desativação.

## Correção

### Arquivo: `src/hooks/useFinancialMetrics.tsx`

**Em `unifiedCashFlow` (linha 501-518):** mostrar pagamentos `paid` SEMPRE (independente de status do cliente). Para pagamentos `pending`/`overdue`/`cancelled`, manter o filtro de cliente ativo (não inflar projeções com clientes desligados).

```ts
paymentsInMonth.forEach(p => {
  const client = clients.find(c => c.id === p.client_id);
  if (!client) return;
  // Pagos: histórico imutável, sempre mostrar.
  // Demais status: ocultar se cliente foi desativado antes do mês (não polui projeção).
  if (p.status !== 'paid' && !wasClientActiveInMonth(client, selectedMonth)) return;
  items.push({ ... });
});
```

**Em `expectedRevenue` (linha 450-458):** aplicar a mesma lógica — receita "realizada" (pagamentos pagos) deve sempre contar para o mês em que entrou, mesmo de cliente desativado. Apenas projeções pendentes/em aberto seguem regra de cliente ativo.

```ts
return paymentsInMonth
  .filter(p => {
    if (p.status === 'cancelled') return false;
    if (p.status === 'paid') return true; // dinheiro real, sempre conta
    const client = clients.find(c => c.id === p.client_id);
    return client && wasClientActiveInMonth(client, selectedMonth);
  })
  .reduce((sum, p) => sum + p.amount, 0);
```

**`overdueAmount` (linha 438-447)** permanece inalterado: faz sentido excluir inadimplência de clientes desativados (não vamos cobrar mais).

**`paidRevenue`, `totalGatewayFees`, `totalNetRevenue`** já estão corretos — não filtram por cliente ativo.

## Resultado esperado

Após desativar Cantinho da Prata:
- As 3 cobranças "Pago" voltam a aparecer no Fluxo de Caixa do mês.
- `paidRevenue` (Caixa Real) já estava correto, continua correto.
- MRR continua excluindo o cliente (projeção futura limpa).
- Cobranças `pending`/`overdue` do cliente desativado continuam ocultas (se ele foi desligado antes do mês), evitando poluir projeção — exceto as que o usuário escolheu "Manter" no Offboarding, que continuam com status `pending` e seguem a regra atual (se o `cancelled_at` for posterior ao mês de vencimento, aparecem; caso contrário, ocultam, o que é o comportamento correto para "MRR limpo").

## Arquivos modificados

- `src/hooks/useFinancialMetrics.tsx` (2 ajustes pontuais nos `useMemo` `unifiedCashFlow` e `expectedRevenue`).
