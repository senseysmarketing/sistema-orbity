

# Fix: Sincronizar apenas formulários da página configurada na integração

## Problema

O botão "Sincronizar Meta" busca formulários de **todas as páginas** da conta Facebook (`list_pages` → loop em todas). Deveria buscar apenas da página que o usuário selecionou na aba de Integrações do CRM.

## Solução

### Alteração em `src/components/crm/LeadScoringConfig.tsx`

**1. Passar informação da página para o `SyncMetaDialog`**

Extrair `page_id` e `page_name` das integrações existentes (tabela `facebook_lead_integrations` já tem esses campos). Ao abrir o dialog, passar a lista de páginas já configuradas.

- Alterar a query em `loadIntegrations` para incluir `page_id` na select
- Adicionar `page_id` à interface `Integration`
- Extrair as páginas únicas das integrações carregadas
- Passar essas páginas como prop ao `SyncMetaDialog`

**2. No `SyncMetaDialog`, buscar formulários apenas das páginas configuradas**

Em vez de chamar `list_pages` (que retorna todas as páginas do Facebook), usar as páginas já conhecidas das integrações:

- Receber prop `configuredPages: Array<{ page_id: string; page_name: string }>`
- Chamar `list_forms` apenas para essas páginas (usando o `page_access_token` obtido via `list_pages` filtrando pelo `page_id`)
- Alternativa mais simples: ainda chamar `list_pages` uma vez, mas filtrar `pgs` para incluir apenas páginas cujo `id` está em `configuredPages` antes do loop de `list_forms`

**Fluxo corrigido:**
```text
list_pages → filtrar só páginas com page_id presente nas integrações → list_forms para cada
```

Isso reduz de 83 páginas para apenas 1-2 páginas configuradas, tornando a busca quase instantânea.

**3. Atualizar a query de integrations para incluir `page_id`**

Linha ~803: adicionar `page_id` ao select:
```
.select("id, page_name, form_name, form_id, pixel_id, page_id")
```

