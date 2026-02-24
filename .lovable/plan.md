

# Adicionar Direcionamento Opcional ao "Melhorar com IA" nas Tarefas

## Resumo

Atualmente, o botao "Melhorar com IA" no dialog de detalhes da tarefa chama a IA diretamente sem possibilidade de dar um direcionamento. A ideia e replicar o mesmo padrao que implementamos no planejamento de conteudo: ao clicar no botao, expande um campo de texto opcional para direcionamento, e um botao para confirmar a geracao.

## O que muda para o usuario

- Ao clicar em "Melhorar com IA", em vez de chamar a IA imediatamente, aparece um campo de texto colapsavel acima do footer
- O usuario pode digitar um direcionamento (ex: "foque mais no tom institucional", "adicione urgencia") ou deixar em branco
- Um botao "Melhorar com IA" dentro do campo expandido confirma e chama a IA com o direcionamento
- Clicar novamente no botao "Melhorar com IA" do footer fecha o campo sem chamar a IA

## Detalhes Tecnicos

### Arquivo: `src/components/tasks/TaskDetailsDialog.tsx`

**Novos estados:**
- `showAIDirection` (boolean) -- controla visibilidade do campo de direcionamento
- `aiDirection` (string) -- texto do direcionamento

**Mudanca no botao "Melhorar com IA" (footer):**
- Em vez de chamar `improveTask` diretamente, alterna `showAIDirection`
- Reseta `aiDirection` ao fechar

**Novo bloco acima do footer (similar ao ContentPlanItemEditDialog):**
- Container com borda e fundo `primary/5`
- Label com icone Sparkles e texto "Direcionamento (opcional)"
- Textarea com placeholder "Descreva como deseja melhorar esta tarefa ou deixe em branco..."
- Botao "Melhorar com IA" que chama `improveTask` passando o direcionamento

**Mudanca no hook `useAIAssist.tsx`:**
- Alterar `improveTask` para aceitar um parametro opcional `direction?: string`
- Concatenar o direcionamento ao JSON enviado para a IA

**Mudanca no edge function `ai-assist/index.ts`:**
- No handler de `improve_task`, extrair o campo `direction` do conteudo
- Incluir o direcionamento no prompt do sistema quando presente

### Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/tasks/TaskDetailsDialog.tsx` | Adicionar campo de direcionamento colapsavel antes do footer |
| `src/hooks/useAIAssist.tsx` | Aceitar parametro `direction` em `improveTask` |
| `supabase/functions/ai-assist/index.ts` | Usar direcionamento no prompt de `improve_task` |

