

# Análise de Campanha com IA

## Resumo

Adicionar um botão "Analisar com IA" dentro da seção expandida de análise semanal de cada campanha. A IA receberá os dados das semanas (gasto, conversões, CPC, CTR, impressões, cliques) junto com o nome e objetivo da campanha, e retornará uma análise completa com tendências, pontos de atenção e recomendações de otimização.

## O que muda para o usuário

- Ao clicar em "Análise" na campanha, além dos cards semanais já existentes, aparecerá um botão "Analisar com IA"
- Ao clicar, a IA analisa a evolução semana a semana e gera um feedback com:
  - Tendências identificadas (custo subindo/descendo, conversões melhorando, etc.)
  - Pontos de atenção (ex: CTR caindo, CPC aumentando)
  - Recomendações práticas de otimização
- A mensagem será formatada para WhatsApp (com emojis e negrito) para fácil compartilhamento
- Botão de copiar para clipboard incluso
- O prompt pode ser personalizado por agência (usa o mesmo sistema de `agency_ai_prompts` com um novo tipo `campaign_analysis`)

## Mudanças Técnicas

### 1. Edge Function `ai-assist/index.ts`

Adicionar novo tipo `campaign_analysis`:
- Novo tool `extract_campaign_analysis` com campo `analysis` (string com a análise completa)
- Prompt padrão orientando a IA a comparar semanas, identificar tendências e dar recomendações
- Buscar prompt personalizado com `prompt_type = 'campaign_analysis'`

### 2. `src/hooks/useAIAssist.tsx`

- Adicionar função `analyzeCampaign(content: string, agencyId?: string)` que chama a edge function com `type: 'campaign_analysis'`
- Adicionar interface `CampaignAnalysisResult` com campo `analysis: string`

### 3. `src/components/traffic/CampaignsAndReports.tsx`

Na seção expandida da campanha (dentro do Collapsible, após os cards semanais):
- Adicionar estado `aiCampaignAnalysis` e `aiCampaignLoading`
- Botão "Analisar com IA" que monta o conteúdo com dados semanais + nome/objetivo da campanha
- Área de exibição da análise gerada (com formatação)
- Botões de copiar e regenerar

### 4. Configurações de IA (opcional, já funciona automaticamente)

O sistema de prompts personalizados (`agency_ai_prompts`) já aceita qualquer `prompt_type`. A nova análise usará `prompt_type = 'campaign_analysis'` e será listada automaticamente nas configurações de IA se adicionarmos a opção no componente de configuração.

## Arquivos Modificados

| Arquivo | Operacao | Descricao |
|---|---|---|
| `supabase/functions/ai-assist/index.ts` | Editar | Adicionar tipo `campaign_analysis` com tool e prompt |
| `src/hooks/useAIAssist.tsx` | Editar | Adicionar funcao `analyzeCampaign` |
| `src/components/traffic/CampaignsAndReports.tsx` | Editar | Adicionar botao e area de analise IA na secao semanal |
| `src/components/settings/AISettingsManager.tsx` | Editar | Adicionar opcao `campaign_analysis` na lista de prompts personalizaveis |

Nenhuma mudanca de banco de dados necessaria.
