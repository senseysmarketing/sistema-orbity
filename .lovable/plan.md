

# Analise de Tarefas com IA Integrada

## Resumo

Atualizar a aba de analises da tela de tarefas para refletir a unificacao (incluindo dados de tarefas de redes sociais), adicionar breakdown por tipo de tarefa, e integrar a IA para gerar analises profundas com recomendacoes acionaveis sobre distribuicao de carga, produtividade e gargalos.

---

## Alteracoes

### 1. Atualizar query no TaskAnalytics.tsx

A query atual nao busca `task_type`. Adicionar este campo ao select para permitir breakdown por tipo (regular, redes sociais, criativos, etc).

```
select: id, title, status, priority, client_id, due_date,
        created_at, updated_at, archived, task_type,
        clients(name), task_assignments(user_id)
```

### 2. Atualizar types.ts

Adicionar `task_type` ao `TaskWithAssignments` e criar nova interface `TypeDistribution` para o breakdown por tipo.

### 3. Novo componente: TypeBreakdownChart

Card com grafico de pizza ou barras horizontais mostrando a distribuicao de tarefas por tipo (`redes_sociais`, `criativos`, `conteudo`, etc). Permite visualizar rapidamente como a carga esta dividida entre tipos de trabalho.

### 4. Atualizar MetricsCards.tsx

Adicionar um 5o card com "Tipos de Tarefa" mostrando quantos tipos distintos existem e o tipo mais comum do periodo, para dar contexto rapido.

### 5. Novo componente: AIAnalysisCard

Este e o componente principal da integracao com IA. Sera um Card com:

- Botao "Gerar Analise com IA" que envia os dados agregados do periodo para a edge function
- Area de texto renderizado com a resposta da IA (formatada em markdown simples)
- Loading state enquanto a IA processa
- Cache da analise por sessao (para nao chamar a IA a cada re-render)

**Dados enviados para a IA:**
- Total de tarefas, concluidas, atrasadas, sem atribuicao
- Taxa de conclusao atual vs mes anterior
- Ranking dos usuarios (nome, tarefas atribuidas, concluidas, atrasadas, taxa de conclusao, tempo medio)
- Ranking dos clientes (nome, total, concluidas, atrasadas, taxa)
- Distribuicao por tipo de tarefa
- Picos de demanda por dia
- Se e mes atual ou historico

**O que a IA vai retornar:**
- Resumo executivo do periodo
- Analise de distribuicao de carga (quem esta sobrecarregado, quem pode receber mais)
- Identificacao de gargalos (revisoes paradas, tarefas sem dono)
- Clientes que precisam de atencao prioritaria
- Sugestoes praticas de melhoria (redistribuir tarefas, ajustar prazos, etc)
- Nota de performance geral (de 1 a 10)

### 6. Atualizar edge function ai-assist

Adicionar novo tipo `analytics_review` que recebe os dados agregados e retorna a analise estruturada. Usar tool calling para extrair dados estruturados.

Nova tool:
```
extract_analytics_review:
  - summary: string (resumo executivo)
  - workload_analysis: string (analise de distribuicao)
  - bottlenecks: string (gargalos identificados)
  - client_alerts: string (clientes que precisam de atencao)
  - suggestions: string[] (lista de sugestoes praticas)
  - performance_score: number (nota de 1 a 10)
  - performance_label: string (ex: "Bom", "Excelente", "Precisa Melhorar")
```

### 7. Atualizar useAIAssist hook

Adicionar nova funcao `analyzeTaskPeriod` que chama o tipo `analytics_review` e retorna o resultado tipado.

### 8. Atualizar SmartInsights.tsx (tasks)

Manter os insights programaticos existentes, mas posicionar o `AIAnalysisCard` logo abaixo deles, para complementar as regras fixas com a analise contextual da IA.

### 9. Layout final do TaskAnalytics

Ordem dos componentes:
1. Header com seletor de mes (existente)
2. MetricsCards (atualizado)
3. AIAnalysisCard (novo - posicao de destaque)
4. TeamPerformanceTable (existente)
5. WorkloadChart (existente)
6. TypeBreakdownChart (novo)
7. SmartInsights (existente)
8. ClientAnalysis (existente)

---

## Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| `src/components/tasks/TaskAnalytics.tsx` | Adicionar task_type na query, calcular distribuicao por tipo, integrar AIAnalysisCard e TypeBreakdownChart |
| `src/components/tasks/analytics/types.ts` | Adicionar task_type ao TaskWithAssignments, nova interface AIAnalysisResult e TypeDistribution |
| `src/components/tasks/analytics/MetricsCards.tsx` | Ajuste menor para refletir dados unificados |
| `src/hooks/useAIAssist.tsx` | Nova funcao analyzeTaskPeriod e interface AIAnalysisResult |
| `supabase/functions/ai-assist/index.ts` | Novo tipo analytics_review com tool calling |

## Novos arquivos

| Arquivo | Descricao |
|---|---|
| `src/components/tasks/analytics/AIAnalysisCard.tsx` | Card com botao para gerar analise IA, exibicao da resposta formatada, loading state |
| `src/components/tasks/analytics/TypeBreakdownChart.tsx` | Grafico de distribuicao por tipo de tarefa |

---

## Detalhes tecnicos

### Edge function - novo tipo analytics_review

System prompt para a IA:
```
Voce e um analista de produtividade de agencias de marketing digital. 
Analise os dados de tarefas do periodo e gere um feedback completo 
para o gestor. Seja direto, pratico e baseado nos numeros. 
Identifique padroes, gargalos e oportunidades de melhoria.
```

Payload enviado (exemplo):
```json
{
  "type": "analytics_review",
  "content": "Periodo: Fevereiro 2026\nTotal: 45 tarefas | Concluidas: 32 (71%) | Atrasadas: 5 | Sem atribuicao: 3\nMes anterior: 65%\n\nEquipe:\n- Ana: 15 tarefas, 12 concluidas (80%), 1 atrasada, tempo medio 3.2 dias\n- Carlos: 18 tarefas, 10 concluidas (56%), 3 atrasadas, tempo medio 5.1 dias\n...\n\nClientes:\n- Cliente A: 12 tarefas, 10 concluidas (83%), 0 atrasadas\n- Cliente B: 8 tarefas, 3 concluidas (38%), 2 atrasadas\n...\n\nDistribuicao por tipo:\n- redes_sociais: 20 (44%)\n- criativos: 12 (27%)\n- conteudo: 8 (18%)\n- outros: 5 (11%)"
}
```

### AIAnalysisCard - comportamento

- Ao clicar "Gerar Analise", os dados agregados sao serializados em texto e enviados para a edge function
- A resposta e cacheada em state local (nao persiste entre navegacoes)
- Se o mes mudar, o cache e limpo e o usuario pode gerar nova analise
- A nota de performance (1-10) e exibida como um badge colorido
- As sugestoes sao renderizadas como uma lista com icones

### TypeBreakdownChart

- Grafico de barras horizontal (recharts) ou donut chart
- Cores por tipo: redes_sociais (rosa), criativos (roxo), conteudo (azul), desenvolvimento (verde), outros (cinza)
- Labels em portugues com nomes amigaveis dos tipos

### Prompt customizavel

O tipo `analytics_review` tambem consulta a tabela `agency_ai_prompts` com `prompt_type = 'analytics'`, permitindo que cada agencia personalize o tom e foco da analise. A tela de configuracoes de IA (`AISettingsManager`) sera estendida com um novo campo para este prompt.
