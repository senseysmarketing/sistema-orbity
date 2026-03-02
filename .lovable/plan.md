

# Mostrar Faturamento do Mes Vigente no Placar Financeiro

## Problema

Atualmente, o placar financeiro usa uma unica flag `isFuture` para todas as linhas (Faturamento, Lucro, Bonus, NPS). Se o mes ainda nao acabou e nao tem receita paga, tudo mostra "Aguardando". Mas o usuario quer ver o faturamento em tempo real conforme os pagamentos sao registrados, mesmo no mes corrente.

## Solucao

Separar a logica de exibicao por indicador:

- **Faturamento**: mostrar o valor real sempre, mesmo que o mes esteja em andamento. Só mostrar "Aguardando" se o mes for estritamente futuro (nem comecou ainda)
- **Lucro Liquido, Pote de Bonus**: manter "Aguardando" para o mes corrente (incompleto), pois custos avulsos podem surgir
- **NPS**: manter a logica atual

## Detalhes Tecnicos

### Arquivo: `src/components/goals/PPRDashboard.tsx`

**1. Alterar o calculo de `isFuture` no `fetchFinancialData` (linha 208-217)**

Adicionar um novo campo `isCurrentMonth` ao objeto `MonthlyFinancial` e ajustar `isFuture` para ser apenas meses que ainda nao comecaram:

```typescript
interface MonthlyFinancial {
  // ... campos existentes
  isFuture: boolean;       // mes que ainda NAO comecou (estritamente futuro)
  isCurrentMonth: boolean; // mes em andamento
}
```

Na construcao dos resultados:
- `isFuture`: `isFuture(startOfMonth(month))` -- o mes nem comecou
- `isCurrentMonth`: o inicio do mes ja passou mas o fim ainda e futuro

**2. Alterar a renderizacao na tabela (linhas 540-595)**

- **Faturamento**: mostrar "Aguardando" apenas se `isFuture` (mes nem comecou). Se for o mes corrente, mostrar o valor real
- **Lucro Liquido e Pote de Bonus**: mostrar "Aguardando" se `isFuture` OU `isCurrentMonth` (mes incompleto)
- **NPS**: manter logica atual com `isFuture`

### Resumo

| Indicador | Mes Futuro | Mes Corrente | Mes Passado |
|-----------|-----------|-------------|-------------|
| Faturamento | Aguardando | Mostra valor real | Mostra valor real |
| Lucro Liquido | Aguardando | Aguardando | Mostra valor real |
| Pote de Bonus | Aguardando | Aguardando | Mostra valor real |
| NPS | Aguardando | Mostra valor real | Mostra valor real |
