

# Substituir aba "Dicas" por Chat IA de Suporte na Central de Ajuda

## Resumo

Remover a aba "Dicas" do HelpCenter e substituir por uma aba "IA Suporte" com chat conversacional. A aba de IA sera a aba padrao (aberta primeiro). O chat usara streaming via uma nova edge function dedicada (`ai-support-chat`) com um system prompt rico sobre todos os modulos da Orbity e contexto da agencia do usuario.

## Arquivos

### 1. Nova edge function: `supabase/functions/ai-support-chat/index.ts`

- Endpoint de chat com streaming SSE
- Recebe `messages` (historico completo) + `agency_context` (nome da agencia, plano, qtd clientes/leads/tarefas)
- System prompt extenso com:
  - Conhecimento de todos os modulos Orbity (Dashboard, CRM, Tarefas, Agenda, Social Media, Trafego, Financeiro, Contratos, Lembretes, Metas/PPR, Configuracoes)
  - Rotas de cada tela (ex: `/dashboard/clients`, `/dashboard/crm`, etc.) para incluir links nas respostas
  - Instrucoes de formatacao: respostas em markdown, com emojis, links das telas como `[Tarefas](/dashboard/tasks)`, texto curto e direto, sem blocos gigantes
  - Sempre finalizar com um insight/dica sobre o que o usuario pode fazer na agencia
  - Tom amigavel, direto, brasileiro
- Usa Lovable AI Gateway com streaming (`stream: true`)
- Retorna SSE stream direto para o cliente
- Trata erros 429/402

### 2. Novo componente: `src/components/help/HelpAIChat.tsx`

- Componente de chat dentro da aba
- Estado: `messages[]` (role + content), `input`, `isLoading`
- Area de mensagens com scroll automatico
- Input com botao de enviar
- Mensagem inicial de boas-vindas da IA (hardcoded, nao consome API)
- Streaming token-by-token usando fetch SSE (mesmo padrao do useful-context)
- Renderiza respostas da IA com `react-markdown` para suportar bold, links, emojis, listas
- Links internos da Orbity (ex: `[CRM](/dashboard/crm)`) navegam via `useNavigate` ao clicar (interceptar clicks em links relativos)
- Sugestoes rapidas como chips clicaveis: "Como usar o CRM?", "Como criar tarefas?", "Como funciona o financeiro?"
- Busca contexto da agencia via `useAgency()` e envia como `agency_context` na primeira chamada

### 3. Modificar: `src/components/help/HelpCenter.tsx`

- Remover aba "Dicas" (tips) e todo o conteudo relacionado (array `tips`, `randomTip`)
- Substituir por aba "IA Suporte" com icone `Bot` ou `Sparkles`
- Mudar `defaultValue` de `"guides"` para `"ai"` (aba IA abre primeiro)
- Tabs: IA Suporte | Guias | Videos (3 colunas mantidas)
- TabsContent "ai" renderiza `<HelpAIChat />`

### 4. Instalar dependencia: `react-markdown`

- Para renderizar as respostas da IA com formatacao adequada

## System Prompt da Edge Function (resumo)

```
Voce e a Orbi, assistente de suporte da Orbity. Responda sempre em PT-BR, com emojis, de forma direta e objetiva.

Modulos da Orbity:
- Dashboard (/dashboard): metricas, timeline do dia, tarefas pendentes
- CRM (/dashboard/crm): funil de vendas, kanban de leads, qualificacao
- Clientes (/dashboard/clients): cadastro, credenciais, arquivos, timeline
- Tarefas (/dashboard/tasks): kanban, analytics, templates, subtarefas
- Agenda (/dashboard/agenda): reunioes, calendario, Google Calendar
- Social Media (/dashboard/social-media): planejamento, posts, calendario editorial
- Trafego (/dashboard/traffic): Facebook Ads, campanhas, relatorios
- Financeiro (/dashboard/admin): clientes, despesas, salarios, fluxo de caixa
- Contratos (/dashboard/contracts): gerador de contratos, templates
- Lembretes (/dashboard/reminders): listas, lembretes pessoais
- Metas (/dashboard/goals): PPR, scorecards, NPS
- Relatorios (/dashboard/reports): dashboards de performance
- Configuracoes (/dashboard/settings): integracao WhatsApp, Google Calendar, IA

Regras de formatacao:
- Use markdown: **negrito**, listas, links
- Links de telas: [nome da tela](/rota)
- Maximo 3-4 paragrafos curtos
- Sempre termine com "💡 **Dica:**" + insight actionavel para a agencia
- Use emojis de forma natural
```

## Detalhes Tecnicos

- Streaming SSE no frontend: mesmo padrao documentado no useful-context (parse line-by-line, `data: [DONE]`)
- `react-markdown` com `remarkGfm` para tabelas e listas
- Links relativos interceptados com onClick handler para usar `navigate()` em vez de reload
- Historico de conversa mantido apenas em memoria (reset ao fechar o sheet)
- Contexto da agencia enviado no body: `{ messages, agency_context: { name, plan, clients_count } }`

