
# Relatorio com IA no Controle de Trafego

## Resumo

Adicionar uma aba "IA" como primeira aba no modal "Gerar Relatorio" que usa a IA para analisar os dados do periodo e gerar uma mensagem personalizada direcionada ao cliente, com feedback e follow-up sobre os resultados. Tambem adicionar um terceiro card de prompt personalizavel na aba de configuracoes de IA.

## O que o usuario vera

### No modal "Gerar Relatorio"
- Nova aba "Relatorio IA" como primeira aba (antes de Templates, Personalizado e Variaveis)
- Um botao "Gerar com IA" que envia os dados do periodo para a IA
- A IA retorna uma mensagem formatada e direcionada ao cliente, com:
  - Resumo dos dados (gasto, impressoes, cliques, conversoes, CTR, CPC, CPM)
  - Analise/feedback sobre a performance do periodo
  - Sugestoes de proximo passo / follow-up
- Botao "Copiar" para copiar a mensagem gerada
- Botao "Regenerar" para gerar novamente com a mesma base de dados

### Nas Configuracoes > IA
- Terceiro card: "Prompt para Relatorios de Trafego"
- Permite personalizar como a IA gera a analise e o tom da mensagem ao cliente

## Mudancas Tecnicas

### 1. Edge Function `ai-assist` - Novo tipo `report_traffic`

Adicionar um terceiro tipo de processamento na edge function:
- Novo tool `extract_report_data` com campo `message` (string) - a mensagem formatada para o cliente
- System prompt padrao: instrui a IA a analisar os dados de trafego pago e gerar uma mensagem profissional direcionada ao cliente, com feedback sobre performance e sugestoes de proximo passo
- Busca prompt customizado da agencia (prompt_type = 'report') se existir
- Os dados do periodo sao passados como contexto no conteudo do usuario

### 2. `ReportGeneratorModal.tsx` - Nova aba "Relatorio IA"

- Adicionar aba "Relatorio IA" com icone Sparkles como primeira aba
- TabsList passa de 3 para 4 colunas
- Conteudo da aba:
  - Botao "Gerar com IA" (estado loading com spinner)
  - Area de exibicao da mensagem gerada (textarea readonly ou pre formatado)
  - Botoes "Copiar" e "Regenerar"
- Receber `agencyId` como prop para passar na chamada da IA
- Usar `useAIAssist` ou chamar diretamente `supabase.functions.invoke("ai-assist")`

### 3. `AISettingsManager.tsx` - Terceiro card de prompt

- Adicionar estado `reportPrompt` seguindo o mesmo padrao de `taskPrompt` e `postPrompt`
- Novo card "Prompt para Relatorios" com placeholder padrao
- Grid passa de 2 para 3 colunas (ou empilha em mobile)
- `fetchPrompts` busca tambem prompt_type = 'report'
- `savePrompt` suporta type = 'report'

### 4. `CampaignsAndReports.tsx` - Passar agencyId ao modal

- Passar `currentAgency?.id` como prop para o `ReportGeneratorModal`

### 5. `useAIAssist.tsx` - Novo tipo de resultado (opcional)

- Adicionar interface `ReportPrefillResult` com campo `message: string`
- Adicionar metodo `generateReport` que chama `callAI("report_traffic", ...)`

## Logica da IA para Relatorios

O conteudo enviado ao usuario da IA sera um JSON stringificado com os dados:

```text
Dados do periodo:
- Conta: {accountName}
- Periodo: {period}
- Investimento: R$ {totalSpend}
- Impressoes: {totalImpressions}
- Cliques: {totalClicks}
- Conversoes: {totalConversions}
- CTR: {avgCTR}%
- CPC: R$ {avgCPC}
- CPM: R$ {avgCPM}
```

O system prompt instrui a IA a:
1. Gerar uma mensagem direcionada ao cliente (nao ao gestor)
2. Incluir resumo dos numeros formatados
3. Analisar a performance (bom/ruim/medio) com base nas metricas
4. Sugerir proximos passos ou otimizacoes
5. Tom profissional mas acessivel
6. Formatar para WhatsApp (com emojis e negrito com asteriscos)

## Prompt Padrao para Relatorios

"Voce e um gestor de trafego pago profissional. Gere uma mensagem direcionada ao cliente com os resultados do periodo. Inclua um resumo dos dados, uma analise da performance e sugestoes de proximo passo. Use tom profissional mas acessivel, formate para WhatsApp com emojis e negrito (*texto*)."

## Arquivos Modificados

| Arquivo | Operacao | Descricao |
|---|---|---|
| `supabase/functions/ai-assist/index.ts` | Editar | Adicionar tipo `report_traffic` com tool e prompt |
| `src/components/traffic/ReportGeneratorModal.tsx` | Editar | Nova aba "Relatorio IA" como primeira aba |
| `src/components/traffic/CampaignsAndReports.tsx` | Editar | Passar agencyId ao modal |
| `src/components/settings/AISettingsManager.tsx` | Editar | Terceiro card para prompt de relatorios |
| `src/hooks/useAIAssist.tsx` | Editar | Novo metodo generateReport |

Nenhum arquivo novo. Nenhuma mudanca de banco de dados (a tabela `agency_ai_prompts` ja suporta qualquer prompt_type).
