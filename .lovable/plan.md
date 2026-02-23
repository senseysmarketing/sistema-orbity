

# Fase 1: Adicionar tipo "Redes Sociais" e campos extras nas tarefas

## Resumo

Adicionar o tipo de tarefa "Redes Sociais" com campos condicionais (plataforma, data de publicacao, hashtags, instrucoes criativas) que aparecem apenas quando esse tipo e selecionado. Atualizar a IA de preenchimento para detectar automaticamente quando uma tarefa e de redes sociais e preencher esses campos extras.

## Alteracoes

### 1. Migration SQL - Adicionar colunas na tabela `tasks`

Novas colunas opcionais:

| Coluna | Tipo | Descricao |
|---|---|---|
| `platform` | text | Plataforma (instagram, facebook, linkedin, etc.) |
| `post_type` | text | Tipo de conteudo (feed, stories, reels, carrossel, video) |
| `post_date` | timestamptz | Data de publicacao programada |
| `hashtags` | text[] | Array de hashtags |
| `creative_instructions` | text | Instrucoes de arte/criacao |

### 2. Adicionar tipo padrao "Redes Sociais" no `useTaskTypes.tsx`

Adicionar na lista `DEFAULT_TYPES`:

```
{ slug: "redes_sociais", name: "Redes Sociais", icon: "📱", is_default: true, is_active: true }
```

### 3. Atualizar o wizard de criacao (Tasks.tsx)

**Estado do formulario**: Adicionar campos `platform`, `post_type`, `post_date`, `hashtags`, `creative_instructions` ao `newTask`.

**Passo 2 (Basico)**: Quando `task_type === "redes_sociais"`, mostrar campos condicionais:
- Plataforma (Select com opcoes: Instagram, Facebook, LinkedIn, Twitter, TikTok, YouTube)
- Tipo de conteudo (Select: Feed, Stories, Reels, Carrossel, Video)

**Passo 3 (Detalhes)**: Quando `task_type === "redes_sociais"`, mostrar:
- Data de publicacao (datetime-local, alem da due_date que ja existe)
- Hashtags (Input de texto separado por virgula)
- Instrucoes de arte/criacao (Textarea)

**Passo 4 (Revisao)**: Incluir os novos campos na tela de revisao quando presentes.

**handleCreateTask / handleUpdateTask**: Salvar os novos campos no banco.

### 4. Atualizar dialogo de edicao (Tasks.tsx)

No formulario de edicao existente, adicionar os mesmos campos condicionais quando `task_type === "redes_sociais"`.

### 5. Atualizar `TaskDetailsDialog.tsx`

Exibir os campos extras (plataforma, tipo de conteudo, data de publicacao, hashtags, instrucoes criativas) quando presentes.

### 6. Atualizar a Edge Function `ai-assist`

Modificar o tool `extract_task_data` para incluir campos de redes sociais:
- `platform` (opcional)
- `post_type` (opcional)
- `hashtags` (opcional, array)
- `creative_instructions` (opcional)

Atualizar o system prompt de tarefas para instruir a IA: "Se o usuario descrever um conteudo para redes sociais, defina suggested_type como 'redes_sociais' e preencha os campos de plataforma, tipo de conteudo, hashtags e instrucoes criativas."

### 7. Atualizar `useAIAssist.tsx`

Adicionar os novos campos ao tipo `TaskPrefillResult`:
- `platform?: string`
- `post_type?: string`
- `hashtags?: string[]`
- `creative_instructions?: string`

### 8. Atualizar logica de aplicacao do resultado da IA (Tasks.tsx)

No callback `onSubmit` do `AIPreFillStep`, mapear os novos campos do resultado da IA para o formulario quando `suggested_type === "redes_sociais"`.

### 9. Interface da Task (Tasks.tsx)

Atualizar a interface `Task` local para incluir os novos campos opcionais.

## Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| Migration SQL | Adicionar 5 colunas na tabela `tasks` |
| `src/hooks/useTaskTypes.tsx` | Adicionar tipo "Redes Sociais" aos defaults |
| `src/hooks/useAIAssist.tsx` | Novos campos em `TaskPrefillResult` |
| `src/pages/Tasks.tsx` | Campos condicionais no wizard, edicao e estado |
| `src/components/tasks/TaskDetailsDialog.tsx` | Exibir campos extras de redes sociais |
| `supabase/functions/ai-assist/index.ts` | Novos campos no tool e prompt de tarefas |

## Detalhes tecnicos

### Campos condicionais no formulario

Os campos extras so aparecem quando `newTask.task_type === "redes_sociais"`. Isso mantem o formulario limpo para outros tipos de tarefa. As plataformas e tipos de conteudo reutilizam as mesmas opcoes ja existentes no modulo de Social Media (Instagram, Facebook, LinkedIn, etc. e Feed, Stories, Reels, etc.), buscando tambem os tipos customizados da agencia quando disponiveis.

### IA inteligente

A IA recebe instrucoes para detectar automaticamente quando o usuario descreve algo para redes sociais (ex: "criar um post no Instagram", "publicar um reels sobre...") e preenche `suggested_type: "redes_sociais"` junto com plataforma, tipo de conteudo, hashtags e instrucoes criativas. Para demandas que nao sao de redes sociais, os campos extras ficam vazios e o formulario mostra apenas os campos padrao.

