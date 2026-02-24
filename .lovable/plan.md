
# Historico de IA + Atualizacao Imediata no Dialog

## Problema 1: Sem registro no historico
Quando o usuario aplica melhorias da IA, nao fica registrado no historico de movimentacoes da tarefa.

## Problema 2: Tarefa nao atualiza visualmente
Apos aplicar as sugestoes da IA, o dialog continua mostrando os dados antigos. O usuario precisa fechar e reabrir para ver as mudancas.

## Solucao

**Arquivo**: `src/components/tasks/TaskDetailsDialog.tsx`

### 1. Importar `useAuth` para obter o nome do usuario atual

### 2. Ao aplicar sugestoes da IA (bloco onClick do botao "Aplicar", ~linha 581-610):

- Montar uma entrada de historico com formato:
  ```
  {
    action: "Tarefa melhorada com IA",
    timestamp: new Date().toISOString(),
    user_name: profile?.name
  }
  ```
- Incluir o historico atualizado (history atual + nova entrada) no objeto `updates` enviado ao Supabase

### 3. Atualizar o estado local do dialog imediatamente apos o sucesso:

- Criar um objeto `task` atualizado com os novos valores (titulo, descricao, etc.)
- Usar `setHistory(...)` para adicionar a nova entrada ao historico local
- O componente ja tem states locais para `history` -- basta atualiza-los

Como o `task` vem via prop e nao tem state local, a abordagem sera:
- Adicionar um state local `localTask` que espelha o `task` prop
- Apos aplicar IA, atualizar `localTask` com os novos valores
- Usar `localTask` na renderizacao em vez do `task` direto

Isso garante que o dialog reflita as mudancas imediatamente sem precisar fechar e reabrir.

### Resumo das alteracoes no arquivo
- Importar `useAuth`
- Adicionar state `localTask` sincronizado com prop `task`
- No handler de aplicar IA: incluir entrada de historico no update e atualizar states locais
- Substituir referencias a `task` por `localTask` na renderizacao
