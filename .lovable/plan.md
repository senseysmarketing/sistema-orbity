

# Layout Lado a Lado: Minhas Tarefas e Tarefas Solicitadas

## Alteracao

**Arquivo**: `src/pages/Index.tsx`

Substituir os dois blocos empilhados (linhas 301-312) por um grid de 2 colunas no desktop:

```
Antes:
  <MyTasksList ... />       (full width)
  <RequestedTasksList ... /> (full width)

Depois:
  <div className="grid gap-4 md:grid-cols-2">
    <MyTasksList ... />
    <RequestedTasksList ... />
  </div>
```

Ambos os componentes ja possuem `h-full` e `max-h-[400px]` com scroll interno, entao funcionarao bem lado a lado sem necessidade de ajustes adicionais.

