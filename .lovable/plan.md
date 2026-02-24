

# Correcao do Calendario + Limpeza de Configuracoes + Refatoracao de Analises

## 1. Erro do Calendario: "column tasks.metadata does not exist"

### Causa raiz
A tabela `tasks` possui colunas individuais (`platform`, `post_type`, `post_date`, `hashtags`, `creative_instructions`) e NAO uma coluna JSONB chamada `metadata`. Porem, dois arquivos fazem queries referenciando `metadata`:

- `src/hooks/useSocialMediaTasks.tsx` (linha 63): query seleciona `metadata` e depois acessa `meta.post_date`, `meta.platform`, etc.
- `src/components/social-media/SocialMediaAnalytics.tsx` (linha 56): mesma abordagem com `metadata`

### Correcao
Nos dois arquivos, substituir a selecao de `metadata` pelos campos reais da tabela:
- Remover `metadata` da query
- Adicionar `platform, post_type, post_date, hashtags, creative_instructions` na select
- Ajustar o mapeamento para ler diretamente de `task.platform`, `task.post_date`, etc. em vez de `meta.platform`, `meta.post_date`

---

## 2. Remocao de abas de Configuracoes obsoletas

Com a unificacao na tabela `tasks`, as seguintes abas de configuracao do Social Media perderam o sentido (referenciavam tabelas/fluxos depreciados):

**Abas a remover:**
- **Status** (CustomStatusManager) -- os status agora sao gerenciados pelo fluxo de Tarefas
- **Tipos** (ContentTypeManager) -- tipos de conteudo agora sao os `task_type` do sistema de Tarefas
- **Aprovacao** (ApprovalRulesManager) -- regras de aprovacao referenciavam o fluxo antigo de posts
- **Templates** (PostTemplateManager) -- templates de post referenciavam a tabela depreciada
- **Horarios** (SchedulePreferencesManager) -- preferencias de horario de publicacao nao se aplicam ao novo fluxo

**Abas a manter:**
- **Plataformas** (PlatformManager) -- ainda relevante para configurar plataformas disponiveis
- **Prazos** (DueDateSettingsManager) -- ainda relevante para definir dias de antecedencia do prazo

O componente `SocialMediaSettings` sera simplificado para exibir apenas essas duas abas.

---

## 3. Refatoracao da aba de Analises (modelo de Tarefas + IA)

A aba de Analises atual (`SocialMediaAnalytics.tsx`) sera completamente refatorada para seguir o mesmo modelo do `TaskAnalytics.tsx`, mas filtrando apenas tarefas do tipo `redes_sociais`.

### Estrutura da nova analise:
1. **Seletor de mes** -- navegacao por mes com indicador de mes historico
2. **MetricsCards** -- total, concluidas, taxa de conclusao, atrasadas, sem atribuicao, media por usuario (reutilizando componentes de tasks/analytics)
3. **AIAnalysisCard** -- analise com IA identica a de Tarefas, usando o mesmo `analyzeTaskPeriod` do `useAIAssist`, mas com dados filtrados para social media
4. **TeamPerformanceTable** -- ranking de performance da equipe para tarefas de social media
5. **WorkloadChart** -- grafico de distribuicao de carga
6. **SmartInsights** -- insights automaticos
7. **ClientAnalysis** -- analise por cliente

### Abordagem tecnica:
- Reutilizar os componentes de `src/components/tasks/analytics/` (MetricsCards, AIAnalysisCard, TeamPerformanceTable, WorkloadChart, SmartInsights, ClientAnalysis)
- A query buscara tarefas com `task_type = 'redes_sociais'` para o mes selecionado
- Os campos `platform`, `post_type`, `post_date` serao lidos diretamente das colunas da tabela
- O calculo de metricas seguira o mesmo padrao do TaskAnalytics
- A analise com IA recebera o mesmo formato de prompt, indicando que se trata de tarefas de Social Media

### Arquivos modificados:
- `src/hooks/useSocialMediaTasks.tsx` -- correcao da query (metadata -> colunas reais)
- `src/components/social-media/SocialMediaAnalytics.tsx` -- refatoracao completa seguindo modelo do TaskAnalytics
- `src/components/social-media/SocialMediaSettings.tsx` -- simplificacao para 2 abas
- `src/pages/SocialMedia.tsx` -- sem alteracao (ja referencia os componentes corretos)

