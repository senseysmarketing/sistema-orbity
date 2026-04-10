

# Snapshot de Dados no Momento de Compartilhar

## Problema
A Edge Function `public-client-report` faz chamadas independentes à Meta Ads API com parâmetros que podem divergir dos usados no dashboard. Isso gera dados inconsistentes (valores diferentes, métricas sem nexo).

## Solução: Salvar um snapshot dos dados no momento do clique em "Compartilhar"
Em vez de re-buscar dados da Meta na Edge Function, **salvar os dados já carregados no dashboard** (metrics, campaigns, chartData) como JSON no banco, e a Edge Function apenas retorna esse snapshot.

## Migration SQL

```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS report_snapshot JSONB;
```

## Arquivos Modificados

### 1. `src/components/traffic/CampaignsAndReports.tsx`
No onClick do botão "Compartilhar", construir o payload snapshot a partir dos states já carregados (`metrics`, `campaigns`, `chartData`) e salvá-lo no campo `report_snapshot`:

```ts
const snapshot = {
  metrics: {
    spend: metrics.spend,
    impressions: metrics.impressions,
    clicks: metrics.clicks,
    conversions: metrics.conversions,
    cpm: metrics.cpm,
    cpc: metrics.cpc,
    ctr: metrics.ctr,
  },
  top_campaigns: campaigns
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)
    .map(c => ({
      name: c.name, objective: c.objective,
      spend: c.spend, conversions: c.conversions,
      impressions: c.impressions, clicks: c.clicks, ctr: c.ctr
    })),
  chart_data: chartData,
  active_campaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
};

// No update:
.update({
  report_token, report_expires_at, report_ad_account_id,
  report_date_from, report_date_to,
  report_snapshot: snapshot,
})
```

### 2. `supabase/functions/public-client-report/index.ts`
Simplificar drasticamente: em vez de chamar a Meta API, apenas:
1. Validar token e expiração (como hoje)
2. Ler `report_snapshot` do registro do cliente
3. Retornar o snapshot diretamente no payload

Eliminar todo o código de chamada à Graph API. A Edge Function passa a ter ~40 linhas.

### 3. `src/pages/PublicClientReport.tsx`
Atualizar a interface `ReportData` para receber os novos campos do snapshot:
- `impressions`, `clicks`, `cpm`, `cpc`, `ctr`
- `chart_data` (dados reais do gráfico em vez de mock)
- Usar `chart_data` no AreaChart em vez do `mockChartData`
- Usar `impressions` e `clicks` reais no funil em vez de valores hardcoded
- Exibir métricas adicionais (CPM, CPC, CTR) se desejado

## Benefícios
- Dados 100% idênticos ao que o usuário vê no dashboard
- Sem chamadas à Meta API na Edge Function (mais rápido, sem risco de token expirado)
- Edge Function fica simples e confiável
- Gráfico e funil com dados reais em vez de mock

## Arquivos totais (3 modificados + migration)
- Migration SQL (nova coluna `report_snapshot`)
- `src/components/traffic/CampaignsAndReports.tsx`
- `supabase/functions/public-client-report/index.ts`
- `src/pages/PublicClientReport.tsx`

