

# Auto-vincular Clientes Mencionados via IA

## Resumo

Quando o usuario mencionar o nome de um cliente no texto de descricao da tarefa ou post, a IA vai identificar e retornar os nomes mencionados. O frontend faz o match contra a lista de clientes da agencia e pre-seleciona automaticamente no campo "Clientes".

## Como Funciona

```text
Usuario digita: "Criar criativo para o Juliano do Campeche, 350m²..."
  -> IA extrai: mentioned_clients: ["Juliano"]
  -> Frontend busca na lista de clientes: "Juliano Campeche Imoveis" (match parcial)
  -> Campo "Clientes" pre-selecionado com esse cliente
```

## Mudancas

### 1. Edge Function `ai-assist` - Adicionar campo `mentioned_clients`

Adicionar `mentioned_clients` como campo opcional nos dois tools (task e post):

- **TASK_TOOLS**: adicionar `mentioned_clients` (array of strings) - "Nomes de clientes ou empresas mencionados pelo usuario"
- **POST_TOOLS**: adicionar `mentioned_clients` (array of strings) - mesmo

Atualizar os system prompts para instruir a IA a extrair nomes de clientes/empresas mencionados no texto.

### 2. Frontend - Passar lista de clientes e fazer match

**`src/pages/Tasks.tsx`** (onSubmit do AIPreFillStep):
- Apos receber `result.mentioned_clients`, fazer match fuzzy contra `clients[]`
- Match: normalizar strings (lowercase, remover acentos) e verificar se o nome do cliente contem o termo mencionado ou vice-versa
- Setar `client_ids` no `newTask` com os IDs encontrados

**`src/components/social-media/PostFormDialog.tsx`** (onSubmit do AIPreFillStep):
- Mesma logica: match dos `mentioned_clients` contra a lista de clientes
- Setar `selectedClientIds` com os IDs encontrados

### 3. Hook `useAIAssist` - Atualizar tipos

Adicionar `mentioned_clients?: string[]` nas interfaces `TaskPrefillResult` e `PostPrefillResult`.

## Logica de Match (Frontend)

```text
Para cada nome em mentioned_clients:
  1. Normalizar: lowercase, remover acentos
  2. Para cada cliente da agencia:
     - Normalizar nome do cliente
     - Verificar se clienteNorm.includes(mencionadoNorm) OU mencionadoNorm.includes(clienteNorm)
  3. Se encontrar match, adicionar o client.id ao array de selecionados
  4. Remover duplicatas
```

Essa abordagem simples e suficiente porque os nomes sao curtos e o contexto e limitado (clientes da mesma agencia).

## Arquivos Modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/ai-assist/index.ts` | Adicionar `mentioned_clients` nos tools + atualizar prompts |
| `src/hooks/useAIAssist.tsx` | Adicionar `mentioned_clients` nos tipos |
| `src/pages/Tasks.tsx` | Match de clientes no callback do AI result |
| `src/components/social-media/PostFormDialog.tsx` | Match de clientes no callback do AI result |

Nenhum arquivo novo. Nenhuma mudanca de banco de dados.
