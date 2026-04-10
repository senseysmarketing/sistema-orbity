

# Relatório Público com Período Selecionado e Conta Específica

## Resumo
Salvar o período de datas e a ad account selecionados no momento do "Compartilhar", enviá-los para a Edge Function, e exibir no relatório público o período correto em vez dos últimos 30 dias fixos.

## Migration SQL

```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS report_date_from DATE,
  ADD COLUMN IF NOT EXISTS report_date_to DATE,
  ADD COLUMN IF NOT EXISTS report_ad_account_id TEXT;
```

## Arquivos Modificados

### 1. `src/components/traffic/CampaignsAndReports.tsx`
- No onClick do botão "Compartilhar":
  - Validar que `selectedAccount` e `dateRange` estão preenchidos (toast de erro se não)
  - Buscar o cliente correspondente ao `selectedAccountName` (não o primeiro da agência)
  - Salvar no update: `report_token`, `report_expires_at`, `report_date_from`, `report_date_to`, `report_ad_account_id` (o `selectedAccount`)
  - Formato das datas: `dateRange.from.toISOString().split('T')[0]`

### 2. `supabase/functions/public-client-report/index.ts`
- Ler `report_date_from`, `report_date_to` e `report_ad_account_id` do registro do cliente
- Usar essas datas no `time_range` da API Meta em vez do hardcoded "últimos 30 dias"
- Filtrar ad accounts pelo `report_ad_account_id` específico (em vez de buscar todas da agência)
- Incluir `period: { from, to }` no payload de resposta

### 3. `src/pages/PublicClientReport.tsx`
- Receber `period` do payload da Edge Function
- Exibir o período formatado no header do relatório (ex: "01/03/2026 - 31/03/2026")
- Substituir ou complementar o subtítulo "Relatório de Performance" com o range de datas

### 4. `src/integrations/supabase/types.ts`
- Será atualizado automaticamente pela migration com os novos campos

## Fluxo Completo
1. Usuário seleciona conta "Aliança Casas de Madeira" e período "01/03 - 31/03"
2. Clica "Compartilhar" → salva token + período + ad_account_id no banco
3. Cliente abre o link → Edge Function lê período e conta do banco → busca métricas da Meta apenas daquela conta e naquele período
4. Relatório exibe dados corretos com o período visível no header

## Arquivos totais (3 modificados + migration)
- Migration SQL
- `src/components/traffic/CampaignsAndReports.tsx`
- `supabase/functions/public-client-report/index.ts`
- `src/pages/PublicClientReport.tsx`

