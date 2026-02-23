
# Adicionar datas nas semanas da analise de campanhas

## O que sera feito

Cada card de semana (Semana 1, Semana 2, etc.) passara a exibir o periodo de datas correspondente, por exemplo: **"Semana 1 (03/02 a 09/02)"**.

## Mudancas tecnicas

### 1. Edge Function `supabase/functions/facebook-analysis/index.ts`

A API do Facebook Insights ja retorna `date_start` e `date_stop` em cada registro, mas o codigo atual ignora esses campos. Vou incluir esses campos no objeto `weeklyData`:

```ts
weeklyData.push({
  week: `Semana ${i + 1}`,
  date_start: insight.date_start,  // novo
  date_stop: insight.date_stop,    // novo
  spend: ...,
  ...
})
```

Para os dados mock (fallback), calcular datas sinteticas baseadas no `startDate` + incrementos de 7 dias.

### 2. Frontend `src/components/traffic/CampaignsAndReports.tsx`

No processamento dos dados recebidos (linha 234), preservar `date_start` e `date_stop`.

No card de cada semana (linha 593), alterar o titulo de:
```
Semana 1
```
Para:
```
Semana 1 (03/02 a 09/02)
```

Usando `format(new Date(week.date_start), "dd/MM")` e `format(new Date(week.date_stop), "dd/MM")`.

Tambem incluir as datas no texto enviado para a analise de IA para maior contexto.

| Arquivo | Descricao |
|---|---|
| `supabase/functions/facebook-analysis/index.ts` | Incluir `date_start` e `date_stop` da API do Facebook no retorno |
| `src/components/traffic/CampaignsAndReports.tsx` | Exibir datas no titulo dos cards semanais |
