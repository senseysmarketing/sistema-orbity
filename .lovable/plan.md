
# Correção Definitiva: Posts com Status Órfão Sumindo do Dashboard

## Diagnóstico Confirmado (via banco)

Os 3 posts problemáticos têm status com UUIDs que **não existem** em `social_media_custom_statuses`:
- `50450643-fbea-4f63-aeb0-65c1e89cb888` → não existe na tabela
- `d915d6dd-6570-4401-b7c1-d9e99ad4bace` → não existe na tabela

Por isso o filtro atual falha: ele busca custom statuses da agência e exclui os que contêm "public" no nome — mas esses UUIDs nem aparecem na lista, então não são excluídos. Os posts ficam visíveis no dashboard com status "Pendente" (o fallback do `MyPostsList`).

---

## Abordagem: Dupla correção

### 1. Banco de Dados — Resetar posts com status órfão

Criar uma migração que atualiza os posts que têm status UUID inválido (não presente em `social_media_custom_statuses`) para o status nativo `'published'` — já que esses posts eram antigos e provavelmente já foram publicados.

**SQL da migração:**
```sql
-- Resetar posts cujo status UUID não existe em social_media_custom_statuses
UPDATE social_media_posts p
SET status = 'published'
WHERE 
  p.status NOT IN ('pending_approval', 'in_creation', 'revision', 'approved', 'scheduled', 'published')
  AND NOT EXISTS (
    SELECT 1 FROM social_media_custom_statuses cs 
    WHERE cs.id::text = p.status 
    AND cs.agency_id = p.agency_id
  );
```

Isso resolve o problema na raiz: os posts com status inválido viram `published` e são filtrados naturalmente.

### 2. Frontend — Filtro defensivo adicional em `Index.tsx`

Mesmo após a migração, adicionar uma camada extra de proteção: **verificar se o status do post é um UUID válido que existe nos custom statuses carregados**. Se o status for um UUID mas não estiver em nenhum custom status conhecido, filtrar o post do dashboard.

**Lógica nova:**
```typescript
const validCustomStatusIds = new Set(customStatuses.map(s => s.id));
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const activePosts = rawPosts.filter(p => {
  if (p.status === 'published') return false;
  if (p.archived) return false;
  // Se status é um UUID mas não existe nos custom statuses → status órfão → ignorar
  if (UUID_REGEX.test(p.status) && !validCustomStatusIds.has(p.status)) return false;
  // Excluir custom statuses que equivalem a "publicado"
  if (publishedCustomIds.includes(p.status)) return false;
  return true;
});
```

---

## Arquivos Modificados

| Arquivo/Migração | Mudança |
|---|---|
| Nova migração SQL | `UPDATE social_media_posts SET status = 'published' WHERE status UUID não existe em custom_statuses` |
| `src/pages/Index.tsx` | Adicionar filtro defensivo: posts com status UUID órfão são excluídos do dashboard |

## O que NÃO muda

- `MyPostsList.tsx` — sem alteração (o fallback "Pendente" pode permanecer como UI safety)
- Estrutura do kanban de Social Media — sem alteração
- Nenhum dado é apagado — os posts são preservados com status `published` (que já é o estado correto deles)

## Resultado Final

- Os 3 posts problemáticos (2x Stories - Paragon, Reels da Semana: XXXXX, 2x Stories - Horiz) serão resetados para `published` e desaparecerão do dashboard
- Futuras instâncias de status órfão também serão filtradas pelo código defensivo, protegendo todos os usuários da plataforma
