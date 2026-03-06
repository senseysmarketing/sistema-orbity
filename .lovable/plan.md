

# Fix: configuredPages vazio quando integração usa form_id="all"

## Problema raiz

A única integração existente tem `form_id = "all"`. O `loadIntegrations` ignora integrações com `form_id === "all"` quando não há leads sincronizados, resultando em `integrations = []`. Como `configuredPages` é construído a partir de `integrations`, ele fica vazio → a edge function nunca é chamada → "Nenhum formulário encontrado".

## Solução

Na construção de `configuredPages` (linha ~972), não usar a lista `integrations` (que é filtrada). Em vez disso, buscar as páginas diretamente da tabela `facebook_lead_integrations` por `agency_id`, independente do `form_id`.

### Alteração em `LeadScoringConfig.tsx`

1. Adicionar um state `configuredPages` separado, populado no `loadIntegrations` **antes** do filtro de `form_id === "all"`.

2. No `loadIntegrations`, extrair as páginas únicas de `rawIntegrations` (antes da expansão):

```typescript
const uniquePages = [...new Map(
  rawIntegrations.map((i) => [i.page_id, { page_id: i.page_id, page_name: i.page_name }])
).values()];
setConfiguredPages(uniquePages);
```

3. Passar esse state ao `SyncMetaDialog` em vez de derivar de `integrations`.

### Arquivo afetado
- `src/components/crm/LeadScoringConfig.tsx`

