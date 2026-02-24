
# Botao "Melhorar com IA" no Dialog de Detalhes da Tarefa

## Resumo
Adicionar um botao com icone de IA (Sparkles) a esquerda do botao "Duplicar" no dialog de detalhes da tarefa. Ao clicar, a IA analisa os dados atuais da tarefa (titulo, descricao, instrucoes criativas, hashtags, etc.) e sugere melhorias que o usuario pode aceitar ou rejeitar.

## Fluxo do Usuario
1. Abre o dialog de detalhes de uma tarefa
2. Clica no botao "Melhorar com IA"
3. O botao mostra um loading (spinner)
4. A IA retorna sugestoes de melhoria (titulo, descricao, instrucoes criativas melhoradas)
5. Um sub-dialog de preview aparece mostrando as melhorias sugeridas (antes/depois)
6. O usuario clica "Aplicar" para salvar ou "Cancelar" para descartar

## Detalhes Tecnicos

### 1. Edge Function `ai-assist` - Novo tipo `improve_task`
**Arquivo**: `supabase/functions/ai-assist/index.ts`

Adicionar um novo tipo de operacao `improve_task` que recebe os dados atuais da tarefa e retorna versoes melhoradas. Reutilizar a mesma estrutura de tool calling ja existente (TASK_TOOLS) com um prompt diferente focado em melhorar e desenvolver o conteudo existente.

Novo prompt: instruir a IA a pegar os dados atuais, corrigir gramatica, expandir a descricao, melhorar instrucoes criativas e sugerir hashtags melhores -- sem mudar o sentido original.

### 2. Hook `useAIAssist` - Nova funcao `improveTask`
**Arquivo**: `src/hooks/useAIAssist.tsx`

Adicionar funcao `improveTask(taskData, agencyId)` que chama `callAI("improve_task", JSON.stringify(taskData), agencyId)`.

### 3. TaskDetailsDialog - Botao e dialog de preview
**Arquivo**: `src/components/tasks/TaskDetailsDialog.tsx`

- Importar `Sparkles` do lucide-react e o hook `useAIAssist`
- Adicionar botao "Melhorar com IA" antes do botao "Duplicar" no `DialogFooter`
- Ao clicar, chamar `improveTask` com os dados atuais da tarefa
- Exibir um AlertDialog de preview com as sugestoes lado a lado
- Ao confirmar, salvar as melhorias via `supabase.from("tasks").update(...)` e chamar `onTaskUpdate`

### Arquivos modificados
- `supabase/functions/ai-assist/index.ts` (novo tipo improve_task + prompt)
- `src/hooks/useAIAssist.tsx` (nova funcao improveTask)
- `src/components/tasks/TaskDetailsDialog.tsx` (botao + dialog de preview)
