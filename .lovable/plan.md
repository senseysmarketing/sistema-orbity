

# Fix: Fluxo oficial Meta para listForms

## Problemas atuais

1. **`listForms` filtra por `user_id`** — outro membro da agência não encontra a conexão
2. **Usa `GET /{page_id}?fields=access_token` para obter page token** — instável, pode falhar dependendo do escopo
3. **Não filtra formulários por `status: ACTIVE`** — retorna arquivados/deletados
4. **Sem proteção contra duplicação** na tabela de integrações

## Solução

### 1. Edge Function `listForms` — fluxo oficial Meta

Arquivo: `supabase/functions/facebook-leads/index.ts`, função `listForms` (~linhas 164-211)

Substituir a lógica atual por:

```
1. Buscar conexão por agency_id (sem user_id)
2. Usar access_token → GET /me/accounts (com paginação)
3. Encontrar a página pelo pageId → extrair page_access_token
4. GET /{page_id}/leadgen_forms?fields=id,name,status&access_token=PAGE_TOKEN
5. Filtrar apenas status === "ACTIVE"
6. Retornar formulários
```

Também corrigir `listPages` da mesma forma (remover `user_id`).

### 2. Frontend — passar `fields=id,name,status` e filtrar ACTIVE

No `SyncMetaDialog`, os formulários já vêm filtrados do backend. Apenas exibir.

### 3. Constraint UNIQUE para evitar duplicação

Migration SQL:

```sql
ALTER TABLE facebook_lead_integrations 
ADD CONSTRAINT unique_agency_form 
UNIQUE (agency_id, form_id);
```

### Arquivos afetados
- `supabase/functions/facebook-leads/index.ts` — funções `listForms` e `listPages`
- Migration para constraint UNIQUE

