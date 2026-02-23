
# Detecção de Data e Prioridade pela IA

## Problema Identificado

Analisando o código, encontrei dois problemas:

1. **Posts - Prioridade não aplicada**: A IA não tem campo `priority` no tool `extract_post_data`, e mesmo que tivesse, o callback do prefill não aplica a prioridade ao `formData` (linhas 746-754 do PostFormDialog).

2. **Posts e Tarefas - Data ignorada**: Nenhum dos tools (`extract_post_data` e `extract_task_data`) possui campo de data. Quando o usuário diz "postar na quarta" ou "entregar dia 28", a IA simplesmente ignora essa informação.

## O que muda para o usuário

- Ao mencionar uma data no texto (ex: "postar na quarta-feira", "para o dia 28/02", "entregar amanhã"), a IA preencherá automaticamente o campo de data correspondente
- Ao mencionar prioridade nos posts (ex: "urgente", "prioridade alta"), o campo de prioridade será preenchido automaticamente
- Para tarefas, a prioridade já funcionava corretamente - apenas a data será adicionada

## Mudanças Técnicas

### 1. Edge Function `ai-assist/index.ts`

**POST_TOOLS** - Adicionar dois campos:
- `priority`: enum ["low", "medium", "high"] - "Prioridade do post. Use 'high' se o usuário mencionar urgência."
- `suggested_date`: string - "Data mencionada pelo usuário no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Extraia de expressões como 'postar na quarta', 'dia 28', 'amanhã', etc."

**TASK_TOOLS** - Adicionar um campo:
- `suggested_date`: string - "Data de vencimento mencionada pelo usuário no formato ISO 8601 (YYYY-MM-DDTHH:mm:ss). Extraia de expressões como 'entregar sexta', 'dia 28', 'amanhã', etc."

**Instruções Técnicas** - Adicionar em ambos (TASK e POST):
- Orientação para a IA considerar a data atual ao interpretar datas relativas ("amanhã", "próxima segunda")
- Enviar a data atual no system prompt para contexto temporal

**System Prompt** - Incluir a data atual (gerada no momento da requisição) para que a IA calcule datas relativas corretamente.

### 2. `src/hooks/useAIAssist.tsx`

- Adicionar `suggested_date?: string` em `PostPrefillResult`
- Adicionar `priority?: string` em `PostPrefillResult`
- Adicionar `suggested_date?: string` em `TaskPrefillResult`

### 3. `src/components/social-media/PostFormDialog.tsx`

No callback do AI prefill (linha 746), adicionar:
- Aplicar `result.priority` ao `formData.priority`
- Aplicar `result.suggested_date` ao `formData.post_date` (e consequentemente `scheduled_date`)

### 4. `src/pages/Tasks.tsx`

No callback do AI prefill (linha 927), adicionar:
- Aplicar `result.suggested_date` ao `newTask.due_date`

## Arquivos Modificados

| Arquivo | Operação | Descrição |
|---|---|---|
| `supabase/functions/ai-assist/index.ts` | Editar | Adicionar campos de data e prioridade nos tools + data atual no prompt |
| `src/hooks/useAIAssist.tsx` | Editar | Adicionar campos nas interfaces |
| `src/components/social-media/PostFormDialog.tsx` | Editar | Aplicar prioridade e data do resultado da IA |
| `src/pages/Tasks.tsx` | Editar | Aplicar data do resultado da IA |

Nenhuma mudança de banco de dados necessária.
