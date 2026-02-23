
# Corrigir Status Duplicados no Formulario de Posts

## Problema

O dropdown de status no formulario de criacao/edicao de posts esta mostrando status duplicados porque:

1. O codigo em `PostFormDialog.tsx` (linhas 727-732) tem **5 status hardcoded** (Rascunho, Em Criacao, Aguardando Aprovacao, Aprovado, Publicado)
2. Alem disso, ele adiciona **todos os status do banco** (linhas 733-737) via query em `social_media_custom_statuses`
3. O banco ja contem esses mesmos status padrao (inseridos pelo `CustomStatusManager`), entao eles aparecem **duas vezes**
4. O nome hardcoded "Rascunho" nao bate com o nome atualizado "Briefing" no banco

O Kanban (`PostKanban.tsx`) ja funciona corretamente porque usa **somente** os status do banco, sem hardcode.

## Solucao

Remover os 5 `SelectItem` hardcoded do dropdown de status e usar exclusivamente os status vindos do banco de dados (a query em `customStatuses` ja busca todos os status ativos, incluindo os padrao).

## Mudancas

### `src/components/social-media/PostFormDialog.tsx`

**Antes** (linhas 727-737):
```
<SelectItem value="draft">Rascunho</SelectItem>
<SelectItem value="in_creation">Em Criacao</SelectItem>
<SelectItem value="pending_approval">Aguardando Aprovacao</SelectItem>
<SelectItem value="approved">Aprovado</SelectItem>
<SelectItem value="published">Publicado</SelectItem>
{customStatuses.map(status => (
  <SelectItem key={status.id} value={status.slug}>
    {status.name}
  </SelectItem>
))}
```

**Depois**:
```
{customStatuses.map(status => (
  <SelectItem key={status.id} value={status.slug}>
    {status.name}
  </SelectItem>
))}
```

Apenas uma alteracao de 5 linhas removidas. A query que busca `customStatuses` (linhas 300-314) ja retorna todos os status ativos ordenados por `order_position`, incluindo os padrao.

### Renomear variavel (opcional mas recomendado)

A variavel `customStatuses` no `PostFormDialog` nao e so customizados — sao **todos** os status. Renomear para `allStatuses` para clareza (alinhado com o padrao do `CustomStatusManager`).

## Nenhum arquivo novo necessario

| Arquivo | Operacao |
|---|---|
| `src/components/social-media/PostFormDialog.tsx` | Editar - remover 5 SelectItem hardcoded |
