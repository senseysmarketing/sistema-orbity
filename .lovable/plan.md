

# Ocultar descrição em cards de tarefas rejeitadas + Fix histórico "undefined"

## Mudanças

### 1. `src/components/ui/task-card.tsx` — ocultar descrição quando rejeitada

Na linha 167, trocar a condição de renderização da descrição para também checar `is_rejected`:

```tsx
{task.description && !isRejected && (
  <p className="text-sm text-white/70 mb-2 line-clamp-2">
    {task.description}
  </p>
)}
```

Resultado: tarefas rejeitadas pelo cliente ficam compactas (badge vermelho + título + data + cliente), independente de terem descrição ou não — visual consistente com o print que você gostou.

### 2. `src/components/tasks/TaskDetailsDialog.tsx` — corrigir "Status: undefined" no histórico

No bloco de renderização do histórico (linhas ~649-664), substituir o fallback genérico por uma função que reconhece entradas vindas da Edge Function `approval-decide` (que grava `type: "external_approval"`, `decision`, `feedback`, `at`, `user`):

- `type: "external_approval"` + `decision: "approved"` → "✅ Aprovado pelo cliente"
- `type: "external_approval"` + `decision: "rejected"` → "❌ Rejeitado pelo cliente" + bloco em itálico abaixo com o `feedback` entre aspas
- Entradas legadas com `entry.action` ou `entry.status` → continuam funcionando
- Fallback final → "Atualização registrada" (em vez de "Status: undefined")
- Timestamp: `entry.timestamp || entry.at`
- Autor: `entry.user_name || entry.user || (type === 'external_approval' ? 'Cliente' : null)`

## Arquivos editados

- `src/components/ui/task-card.tsx` — 1 linha alterada (condição de descrição).
- `src/components/tasks/TaskDetailsDialog.tsx` — bloco do histórico (~15 linhas).

## Sem mudanças

- Edge Functions, schema, lógica de aprovação e demais seções do modal — preservados.
- Cards não-rejeitados continuam exibindo descrição normalmente.

