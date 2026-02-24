

# Ajustes no NPS: Grafico, Scorecard Automatico e Filtro por Data

## 1. Grafico "Distribuicao NPS" - Labels sobrepostos

O problema e que as labels inline do grafico de pizza (`Promotores 100%`, `Detratores 0%`) ficam uma em cima da outra quando os segmentos sao pequenos ou zerados.

**Arquivo**: `src/components/goals/NPSChart.tsx`

- Remover a prop `label` do componente `Pie` (que renderiza texto diretamente sobre o grafico)
- Manter `Tooltip` e `Legend` para que o usuario veja os dados ao passar o mouse e na legenda inferior
- Adicionar uma listagem simples abaixo do score com os percentuais (ex: "Promotores: 1 (100%) | Neutros: 0 | Detratores: 0") para manter a informacao visivel sem sobreposicao

## 2. NPS automatico no Scorecard da Equipe

O campo "NPS e Retencao" nos scorecards atualmente comeca em 0 e precisa ser preenchido manualmente. Sera pre-preenchido automaticamente com o NPS da agencia normalizado para escala 0-10.

**Arquivo**: `src/components/goals/ScorecardCard.tsx`

- Adicionar prop `agencyNps: number` (o NPS calculado, escala -100 a 100)
- Se o campo `nps_retention_score` do scorecard for 0 e existe um NPS calculado, mostrar um botao "Usar NPS" ao lado do input para auto-preencher
- Formula de normalizacao: `Math.min(10, Math.max(0, (nps + 100) / 20))` (NPS -100 = nota 0, NPS 0 = nota 5, NPS 100 = nota 10)

**Arquivo**: `src/components/goals/PPRDashboard.tsx`

- Passar `agencyNps={npsStats.nps}` como prop ao `ScorecardCard`
- Quando o admin clicar "Usar NPS", chamar `handleScorecardUpdate` com o valor normalizado

## 3. Data na resposta NPS + filtro no Placar Financeiro

Atualmente a resposta NPS usa `created_at` automatico mas nao tem campo de data editavel. Uma resposta criada hoje (fevereiro) aparece no placar financeiro do periodo, mesmo que o periodo seja Mar-Mai.

**Arquivo**: `src/components/goals/NPSResponseForm.tsx`

- Adicionar campo `Data da Resposta` (input type date) para o admin definir a data real da pesquisa NPS
- Valor padrao: data de hoje
- Salvar no campo `created_at` ou, melhor, usar o campo `response_date` (precisara adicionar a coluna)

**Banco de dados**: Adicionar coluna `response_date` (tipo `date`) na tabela `nps_responses` com default `CURRENT_DATE`

**Arquivo**: `src/components/goals/PPRDashboard.tsx`

- No NPS da tabela financeira mensal: filtrar `nps_responses` pela `response_date` dentro do range do mes, em vez de pegar o NPS global do periodo
- Atualizar `fetchNpsResponses` para tambem buscar `response_date`
- Na linha de NPS da tabela, mostrar o NPS calculado por mes (baseado nas respostas daquele mes) em vez de "—"

## Arquivos Modificados

- `src/components/goals/NPSChart.tsx` - Remover labels inline, adicionar breakdown textual
- `src/components/goals/ScorecardCard.tsx` - Prop `agencyNps`, botao "Usar NPS" 
- `src/components/goals/NPSResponseForm.tsx` - Campo de data da resposta
- `src/components/goals/PPRDashboard.tsx` - Passar agencyNps, filtrar NPS por data, NPS mensal na tabela
- Nova migration SQL para adicionar `response_date` na tabela `nps_responses`

