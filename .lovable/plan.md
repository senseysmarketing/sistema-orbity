
# Atualizar Analytics do Painel Master — Remover Trial/Planos, Adicionar Inadimplencia

## Alteracoes em `src/components/master/MasterAnalytics.tsx`

### 1. KPI Cards (linha 200-261)
- **Taxa de Conversao**: Mudar de "Trials → Pagantes" para "Agencias Ativas / Total" (taxa de ativacao)
- **Churn Rate**: Manter, mas ajustar calculo sem trial
- **Ticket Medio**: Manter como esta
- **LTV Estimado**: Manter como esta

### 2. Remover referencias a trial no calculo `conversionMetrics` (linhas 104-127)
- `conversionRate` = agencias ativas / total de agencias
- Remover `trialExpiredRate`
- Remover `trial_expired` do calculo

### 3. STATUS_COLORS e STATUS_LABELS (linhas 47-63)
- Remover `trialing` e `trial_expired`
- Adicionar `inadimplente` se necessario (mapear `past_due`)

### 4. Grafico de Crescimento (linhas 130-138)
- Mudar label "convertidas" para "ativas" (agencias que pagaram)

### 5. Distribuicao de Status — Pie Chart (linhas 315-371)
- Remover trial do dados, manter apenas: Ativo, Inadimplente, Cancelado, Suspenso

### 6. Oportunidades e Alertas (linhas 420-479)
- Remover secao "Trials expirando em breve" (linhas 430-450)
- Expandir secao de "Pagamentos pendentes" para mostrar inadimplencia com mais detalhe (valor mensal da agencia, dias em atraso)
- Adicionar alerta para agencias suspensas

### 7. Top Agencias por Uso — Tabela (linhas 482-546)
- Remover coluna "Plano" (linha 499 e 529-531)
- Adicionar coluna "Valor Mensal" mostrando `monthly_value`

### 8. `src/hooks/useMaster.tsx`
- Zerar `trialing` e `trial_expired` definitivamente no `getStatusCounts` (ja feito parcialmente)

## Resultado
- Sem mencoes a trial ou planos em toda a aba Analytics
- Secao de inadimplencia/alertas mais rica com informacoes de valor e agencias suspensas
