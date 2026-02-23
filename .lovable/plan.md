

# Auto-vincular Usuarios Mencionados via IA

## Resumo

Adicionar extração automática de nomes de usuários mencionados no texto da IA, usando o mesmo padrão de match fuzzy que já funciona para clientes. Quando o usuário disser algo como "quero que a Laryssa faça...", a IA extrairá "Laryssa" e o sistema vinculará automaticamente ao perfil correspondente.

## O que muda para o usuário

- Ao mencionar nomes de membros da equipe no texto para a IA (ex: "a Laryssa vai fazer", "atribuir pro João"), o campo "Usuários atribuídos" será preenchido automaticamente
- Funciona tanto para Tarefas quanto para Posts
- Usa o mesmo match fuzzy que já existe para clientes (normaliza acentos, case insensitive, match parcial)

## Mudanças Técnicas

### 1. Edge Function `ai-assist/index.ts`

Adicionar campo `mentioned_users` nos dois tools (TASK_TOOLS e POST_TOOLS):
- Tipo: array de strings
- Descrição: "Nomes de pessoas mencionadas como responsáveis ou que devem executar a tarefa/post. Extraia nomes próprios de pessoas que o usuário indica como executores."

Adicionar nas instruções técnicas (TASK_TECHNICAL_INSTRUCTIONS e POST_TECHNICAL_INSTRUCTIONS) a orientação para extrair nomes de usuários mencionados.

### 2. `src/hooks/useAIAssist.tsx`

Adicionar `mentioned_users?: string[]` nas interfaces `TaskPrefillResult` e `PostPrefillResult`.

### 3. `src/pages/Tasks.tsx`

No callback do AI prefill (passo 1), após o match de clientes, adicionar match de usuários:
- Usar a mesma função `normalize` que já existe
- Comparar `result.mentioned_users` contra `profiles` (que já está carregado)
- Setar `newTask.assigned_users` com os user_ids correspondentes

### 4. `src/components/social-media/PostFormDialog.tsx`

No callback do AI prefill (passo 1), após o match de clientes, adicionar match de usuários:
- Comparar `result.mentioned_users` contra `profiles` (que já está carregado)
- Chamar `setSelectedUserIds` com os IDs correspondentes

## Arquivos Modificados

| Arquivo | Operação | Descrição |
|---|---|---|
| `supabase/functions/ai-assist/index.ts` | Editar | Adicionar `mentioned_users` nos tools e instruções |
| `src/hooks/useAIAssist.tsx` | Editar | Adicionar campo na interface |
| `src/pages/Tasks.tsx` | Editar | Match fuzzy de usuários no prefill |
| `src/components/social-media/PostFormDialog.tsx` | Editar | Match fuzzy de usuários no prefill |

Nenhuma mudança de banco de dados necessária.
