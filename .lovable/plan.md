
# Corrigir invalidação de cache ao criar/modificar status

## Causa raiz

A função `invalidateStatuses()` em `CustomStatusManager.tsx` invalida as query keys:
- `"social-media-statuses-all"` (usada pelo próprio CustomStatusManager)
- `"custom-statuses"` (query key antiga, já não existe mais)

Mas **não invalida** `"social-media-statuses-kanban"`, que é exatamente a query key usada pelo `PostKanban.tsx` após a refatoração da última atualização. Por isso, ao criar "Criados", o Kanban não recarregou os dados — só teria atualizado ao recarregar a página manualmente.

## Solução — 1 linha, 1 arquivo

Adicionar `"social-media-statuses-kanban"` à função `invalidateStatuses()` no `CustomStatusManager.tsx`.

### Mudança na função `invalidateStatuses`:

```ts
// ANTES (quebrado)
const invalidateStatuses = () => {
  queryClient.invalidateQueries({ queryKey: ["social-media-statuses-all"] });
  queryClient.invalidateQueries({ queryKey: ["custom-statuses"] }); // key antiga, não existe mais
};

// DEPOIS (corrigido)
const invalidateStatuses = () => {
  queryClient.invalidateQueries({ queryKey: ["social-media-statuses-all"] });
  queryClient.invalidateQueries({ queryKey: ["social-media-statuses-kanban"] }); // key do PostKanban
};
```

Essa mesma correção precisa ser aplicada também no `onSuccess` do `initializeDefaultsMutation`, que também invalida a key antiga `"custom-statuses"`.

## Impacto

Com essa correção, sempre que um status for:
- **Criado** → Kanban atualiza automaticamente mostrando a nova coluna
- **Excluído** → Kanban remove a coluna automaticamente
- **Desativado** → Kanban remove a coluna automaticamente
- **Reordenado** → Kanban reflete a nova ordem automaticamente

## Arquivo modificado

| Arquivo | Mudança |
|---------|---------|
| `src/components/social-media/settings/CustomStatusManager.tsx` | Substituir `"custom-statuses"` por `"social-media-statuses-kanban"` em todos os pontos de invalidação de cache |
