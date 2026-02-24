

# Placar Financeiro com Tabela Mensal + Integracao Automatica

## O que muda

Substituir os 4 cards atuais do "Placar do Trimestre" por uma tabela mensal como no print de referencia, mostrando colunas para cada mes do periodo + coluna de Total/Meta do trimestre. Os dados serao puxados automaticamente das tabelas financeiras existentes (`client_payments`, `expenses`, `salaries`).

## Layout da Tabela

```text
| Indicador         | Março      | Abril      | Maio       | Total Trimestre |
|-------------------|------------|------------|------------|-----------------|
| Faturamento (R$)  | R$ 35.000  | R$ 42.000  | R$ 50.000  | Meta: R$ 50.000 |
| Lucro Líquido (R$)| R$ 17.500  | R$ 21.000  | R$ 25.000  | R$ 63.500       |
| Pote de Bônus     | R$ 1.750   | R$ 2.100   | R$ 2.500   | R$ 6.350        |
| NPS Geral         | Aguardando | Aguardando | Pesquisa   | Meta: > 60      |
```

- A coluna "Total Trimestre" mostra a meta de faturamento (configuravel) e os totais acumulados
- "Faturamento" refere-se ao faturamento recorrente (pagamentos de clientes com status "paid")
- Meses futuros exibem "Aguardando" ou o valor parcial caso ja tenha dados
- Barra de progresso abaixo da tabela mostrando o quanto ja atingiu da meta

## Integracao com Dados Financeiros

**Arquivo**: `src/components/goals/PPRDashboard.tsx`

### Busca automatica por mes:
Para cada mes dentro do range `start_date` a `end_date` do periodo selecionado, o sistema buscara:

1. **Faturamento**: `SUM(amount)` de `client_payments` com `status = 'paid'` e `due_date` dentro do mes, filtrado por `agency_id`
2. **Despesas**: `SUM(amount)` de `expenses` com `status = 'paid'` no mesmo mes
3. **Salarios**: `SUM(amount)` de `salaries` com `status = 'paid'` no mesmo mes
4. **Lucro Liquido por mes**: Faturamento - (Despesas + Salarios)
5. **Pote de Bonus por mes**: Lucro Liquido * (bonus_pool_percent / 100)

### Calculo do Total Trimestre:
- Soma dos faturamentos mensais
- Soma dos lucros liquidos
- Soma dos potes de bonus
- NPS: valor calculado das respostas NPS do periodo

### Atualizacao automatica do periodo:
Apos calcular, os valores `revenue_actual`, `net_profit` e `bonus_pool_amount` na tabela `bonus_periods` serao atualizados automaticamente.

## Remocao dos Inputs Manuais

Os inputs manuais de "Faturamento Real" e "Lucro Liquido" que estao no Bloco 3 (Scorecard) serao removidos, ja que agora os dados vem automaticamente do financeiro.

## Meta de Faturamento Recorrente

O label do campo de meta sera ajustado para "Meta de Faturamento Recorrente" no `PPRConfigDialog`, deixando claro que a meta se refere ao faturamento recorrente mensal que a agencia quer atingir (ex: R$ 50.000/mes), nao ao total do trimestre.

A coluna "Total Trimestre" da linha de faturamento mostrara a meta mensal como referencia (ex: "Meta: R$ 50.000"), pois o objetivo e atingir esse valor recorrente ate o final do periodo.

## Arquivos Modificados

- `src/components/goals/PPRDashboard.tsx` - Nova funcao `fetchFinancialData()` que busca dados por mes, nova tabela HTML no Bloco 1, remocao dos inputs manuais do Bloco 3
- `src/components/goals/PPRConfigDialog.tsx` - Label da meta ajustado para "Meta de Faturamento Recorrente"

