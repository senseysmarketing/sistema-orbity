

# Correção: Traduzir UUIDs de Status Customizados

## Problema Identificado

Na aba "Planejamento", os posts estão mostrando códigos UUID como status:
- `d9ae55c5-4b45-4c34-899c-69cc10004940`
- `63c9cf9d-f96d-4c04-8186-ad9ea1c3a485`

Isso acontece porque:
1. Posts podem ter **status customizados** (criados na aba Configurações)
2. O campo `post.status` armazena o **UUID** do status customizado
3. A função `translateStatus()` atual só mapeia slugs padrão (draft, in_creation, etc)
4. Quando o status é um UUID, não há tradução e o UUID é exibido diretamente

---

## Solução

Buscar os status customizados do banco e criar um mapa de tradução dinâmico que inclua tanto os status padrão quanto os customizados.

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/social-media/planning/ClientPlanningDetails.tsx` | Buscar status customizados e traduzir UUIDs |

---

## Implementação

### 1. Buscar Status Customizados

Adicionar query para buscar os status customizados da agência:

```typescript
import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";

// Dentro do componente
const { currentAgency } = useAgency();

const { data: customStatuses = [] } = useQuery({
  queryKey: ['custom-statuses', currentAgency?.id],
  queryFn: async () => {
    if (!currentAgency?.id) return [];
    const { data } = await supabase
      .from('social_media_custom_statuses')
      .select('id, name, slug, color')
      .eq('agency_id', currentAgency.id);
    return data || [];
  },
  enabled: !!currentAgency?.id,
});
```

### 2. Criar Mapa de Tradução Dinâmico

Combinar status padrão com customizados:

```typescript
const statusMap = useMemo(() => {
  const map: Record<string, { label: string; color: string }> = {
    // Status padrão
    draft: { label: 'Briefing', color: 'bg-gray-500' },
    in_creation: { label: 'Em Criação', color: 'bg-blue-500' },
    pending_approval: { label: 'Aguardando Aprovação', color: 'bg-yellow-500' },
    approved: { label: 'Aprovado', color: 'bg-green-500' },
    published: { label: 'Publicado', color: 'bg-purple-500' },
  };
  
  // Adicionar status customizados (por ID e por slug)
  customStatuses.forEach(status => {
    map[status.id] = { label: status.name, color: status.color };
    map[status.slug] = { label: status.name, color: status.color };
  });
  
  return map;
}, [customStatuses]);
```

### 3. Atualizar Função getStatusBadge

```typescript
const getStatusBadge = (status: string) => {
  const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-500' };
  const category = categorizeStatus(status);
  const colors = {
    ready: "bg-green-100 text-green-700",
    inProgress: "bg-blue-100 text-blue-700",
    draft: "bg-muted text-muted-foreground",
  };
  return <Badge className={colors[category]}>{statusInfo.label}</Badge>;
};
```

---

## Resultado

| Antes | Depois |
|-------|--------|
| `d9ae55c5-4b45-4c34-899c-69cc10004940` | Nome do Status Customizado |
| `63c9cf9d-f96d-4c04-8186-ad9ea1c3a485` | Nome do Status Customizado |
| `draft` | Briefing |
| `pending_approval` | Aguardando Aprovação |

---

## Benefícios

1. **UX melhorada**: Usuários veem nomes legíveis em vez de códigos
2. **Consistência**: Mesmos nomes usados no Kanban aparecem no Planejamento
3. **Dinamismo**: Novos status customizados são automaticamente suportados

