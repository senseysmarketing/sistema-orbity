
# Correção: Posts Atrasados Incorretos no Dashboard

## Diagnóstico Completo

Três problemas simultâneos causam o que aparece na tela:

### Problema 1 — Posts arquivados aparecem no dashboard
A query em `Index.tsx` (linha 103-110) **não filtra `archived: false`**:
```typescript
supabase
  .from('social_media_posts')
  .select('*, clients(name)')
  .eq('agency_id', currentAgency.id)
  .in('id', myPostIds)
  .neq('status', 'published')   // ← só exclui 'published' literal
  // ← NÃO tem .eq('archived', false)
```
O post `c761a30c` (archived: true) passa pelo filtro e aparece no dashboard.

### Problema 2 — Posts com status customizado (UUID) não são filtrados
A agência usa statuses customizados (IDs como `50450643-fbea...`, `d915d6dd-6570...`). O filtro `.neq('status', 'published')` só exclui o status literal `'published'` — posts com status UUID (incluindo os que equivalem a "Publicado") **não são excluídos**.

Consultei a tabela `social_media_custom_statuses`: o status "Publicado" customizado tem ID `b12052c8-07bb-4022-9296-6f7ad1f081dd`. Os UUIDs nos posts problemáticos (`50450643...` e `d915d6dd...`) **não existem** na tabela — são statuses órfãos de dados antigos.

### Problema 3 — UUIDs exibidos como "cliente" no dashboard
O `MyPostsList` exibe `post.client_name`, mas alguns posts têm o UUID do status aparecendo onde deveria estar o nome do cliente. Isso é visual: na imagem, o que parece ser "50450643-fbea..." está no lugar onde deveria estar o status, porque o `statusConfig` do `MyPostsList` só mapeia statuses nativos (`pending_approval`, `in_creation`, etc.) e não resolve statuses UUID.

## Solução

### Mudança 1 — `Index.tsx`: adicionar filtros corretos à query de posts

Adicionar `.eq('archived', false)` e **não depender apenas de `neq('status', 'published')`**. Em vez disso, filtrar os statuses que realmente indicam "pendente de ação" incluindo os UUIDs dos custom statuses válidos (via join ou filtragem no frontend).

A abordagem mais simples e robusta: **buscar os custom statuses da agência** junto com os posts e fazer a filtragem no frontend.

```typescript
// Buscar custom statuses da agência
const { data: customStatuses } = await supabase
  .from('social_media_custom_statuses')
  .select('id, name')
  .eq('agency_id', currentAgency.id);

// IDs de custom statuses que equivalem a "publicado" (para excluir)
const publishedCustomIds = (customStatuses || [])
  .filter(s => s.name.toLowerCase().includes('public'))
  .map(s => s.id);
```

E na query de posts, adicionar `.eq('archived', false)`.

No frontend, filtrar posts antes de exibir:
```typescript
const nativePublished = ['published'];
const activePosts = postsData.filter(p =>
  !nativePublished.includes(p.status) &&
  !publishedCustomIds.includes(p.status) &&
  !p.archived
);
```

### Mudança 2 — `MyPostsList.tsx`: resolver custom statuses com labels corretos

Passar o array de custom statuses via prop e resolver o label/cor ao exibir. Se o status for um UUID e estiver nos custom statuses, exibir o nome correto. Se não existir em nenhum mapa, exibir "Pendente" como fallback (para cobrir statuses órfãos sem crashar).

```typescript
// Nova prop
interface MyPostsListProps {
  posts: Post[];
  customStatuses?: { id: string; name: string; color: string }[];
  onViewAll?: () => void;
}

// Resolução no render
const getStatusConfig = (status: string) => {
  // 1. Tentar status nativo
  if (nativeStatusConfig[status]) return nativeStatusConfig[status];
  // 2. Tentar custom status
  const custom = customStatuses?.find(s => s.id === status);
  if (custom) return { label: custom.name, className: 'border-gray-200 text-gray-700 bg-gray-50' };
  // 3. Fallback
  return { label: 'Pendente', className: 'border-gray-200 text-gray-600 bg-gray-50' };
};
```

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/Index.tsx` | Adicionar `.eq('archived', false)` na query de posts; buscar `social_media_custom_statuses` da agência; filtrar posts publicados (nativos + custom) no frontend antes de setar estado |
| `src/components/dashboard/MyPostsList.tsx` | Adicionar prop `customStatuses`; resolver label/cor de statuses UUID via lookup; fallback seguro para statuses órfãos |

## O que NÃO muda

- Lógica de `post_assignments` — mantida
- Estrutura do `MyPostsList` (seções Atrasados/Hoje/Semana) — mantida
- Nenhuma migração de banco necessária — só correção de query e resolução de UI
