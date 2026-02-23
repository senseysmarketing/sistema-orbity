
# Prompts de IA Personalizaveis por Agencia

## Resumo

Adicionar uma aba "IA" nas Configuracoes (Settings) onde o admin da agencia pode personalizar os prompts usados pela IA ao pre-preencher tarefas e posts. Cada agencia tera seus proprios prompts salvos no banco, permitindo adaptar o tom de voz, nicho e particularidades do negocio.

## O que o usuario vera

Na pagina de Configuracoes, uma nova aba "IA" (com icone Sparkles) aparecera para admins da agencia. Dentro dela, dois cards separados:

1. **Prompt para Tarefas** - Textarea com o prompt atual como placeholder/default, onde o admin pode personalizar como a IA gera titulos, descricoes e prioridades de tarefas
2. **Prompt para Posts** - Textarea com o prompt atual como placeholder/default, onde o admin pode personalizar como a IA gera legendas, hashtags e tipo de conteudo

Cada card tera:
- Textarea com o prompt personalizado
- Botao "Restaurar padrao" para voltar ao prompt original
- Botao "Salvar"
- Dica explicativa sobre o que o prompt controla

## Mudancas Tecnicas

### 1. Nova tabela: `agency_ai_prompts`

```text
- id (uuid, PK)
- agency_id (uuid, FK -> agencies, unique constraint com prompt_type)
- prompt_type (text: 'task' ou 'post')
- custom_prompt (text)
- created_at (timestamp)
- updated_at (timestamp)

Constraint: UNIQUE(agency_id, prompt_type)
RLS: leitura para membros da agencia, escrita para admins
```

### 2. Edge Function `ai-assist` - Buscar prompt customizado

Antes de chamar a IA, a edge function recebe o `agency_id` no body da requisicao. Ela consulta `agency_ai_prompts` para verificar se existe um prompt personalizado para aquela agencia e tipo. Se existir, concatena o prompt customizado ao system prompt base (mantendo as instrucoes tecnicas obrigatorias como extrair mentioned_clients e responder em PT-BR).

Logica:
```text
System prompt final = prompt_customizado_da_agencia + instrucoes_tecnicas_fixas
```

As instrucoes tecnicas fixas (extrair mentioned_clients, responder em PT-BR, gerar titulo conciso) sao sempre adicionadas ao final, garantindo que a IA continue funcionando corretamente mesmo com prompts customizados.

### 3. Novo componente: `AISettingsManager`

Componente que renderiza os dois cards de prompt (tarefas e posts). Usa queries para buscar/salvar os prompts da agencia.

### 4. Settings.tsx - Nova aba "IA"

Adicionar aba "IA" com icone Sparkles na pagina de configuracoes, visivel apenas para admins. Grid de colunas atualizado de 7 para 8.

### 5. Frontend - Passar `agency_id` nas chamadas

O hook `useAIAssist` e os componentes que chamam `preFillTask`/`preFillPost` passam o `agency_id` para a edge function.

## Arquivos

| Arquivo | Operacao | Descricao |
|---|---|---|
| Migracao SQL | Criar | Tabela `agency_ai_prompts` com RLS |
| `src/components/settings/AISettingsManager.tsx` | Criar | Componente com os dois cards de prompt |
| `src/pages/Settings.tsx` | Editar | Adicionar aba "IA" com Sparkles |
| `supabase/functions/ai-assist/index.ts` | Editar | Receber agency_id, buscar prompt customizado, concatenar ao system prompt |
| `src/hooks/useAIAssist.tsx` | Editar | Passar agency_id nas chamadas |
| `src/pages/Tasks.tsx` | Editar | Passar agency_id ao chamar preFillTask |
| `src/components/social-media/PostFormDialog.tsx` | Editar | Passar agency_id ao chamar preFillPost |

## Prompts Padrao (exibidos como placeholder)

**Tarefas:**
"Voce e um assistente de agencia de marketing digital. Gere um titulo conciso e uma descricao profissional, estruturada e sem erros de gramatica para a tarefa descrita."

**Posts:**
"Voce e um social media manager profissional. Gere uma legenda envolvente, profissional e adaptada para a plataforma sugerida. Inclua hashtags relevantes."

Esses textos aparecem como placeholder nos textareas. Se o admin nao personalizar, o comportamento atual e mantido.
