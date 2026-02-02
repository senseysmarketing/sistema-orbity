
# Correção: Nome do Status no Histórico de Movimentações

## Problema

No histórico de movimentações do modal de detalhes de posts, o status está sendo exibido como um código UUID (ex: `33efe0b1-624b-42bb-af1c-af1b53903415`) em vez do nome legível (ex: "Aguardando Aprovação").

---

## Causa

O histórico salva dois campos relevantes:

| Campo | Valor salvo | Problema |
|-------|-------------|----------|
| `entry.status` | UUID ou slug do status | Não traduzido para nome |
| `entry.action` | "Status alterado para: {nome ou UUID}" | Se não encontrar o nome, salva o UUID |

Quando o bug de drag-and-drop aconteceu (já corrigido), o status foi salvo como UUID e o campo `action` foi gerado com esse UUID.

Atualmente, o `PostDetailsDialog.tsx` exibe diretamente:
```tsx
{entry.action || `Status: ${entry.status}`}
```

Sem traduzir UUIDs para nomes de status.

---

## Solução

Modificar o `PostDetailsDialog.tsx` para:

1. **Buscar status customizados** da tabela `social_media_custom_statuses`
2. **Criar função de tradução** que converte UUID/slug para nome legível
3. **Aplicar tradução** no texto exibido do histórico

---

## Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/social-media/PostDetailsDialog.tsx` | Buscar status e traduzir histórico |

---

## Implementação Técnica

### 1. Adicionar query para buscar status customizados

```typescript
import { useQuery } from "@tanstack/react-query";
import { useAgency } from "@/hooks/useAgency";

// Dentro do componente:
const { currentAgency } = useAgency();

const { data: customStatuses = [] } = useQuery({
  queryKey: ['custom-statuses', currentAgency?.id],
  queryFn: async () => {
    if (!currentAgency?.id) return [];
    const { data } = await supabase
      .from('social_media_custom_statuses')
      .select('id, slug, name')
      .eq('agency_id', currentAgency.id);
    return data || [];
  },
  enabled: !!currentAgency?.id,
});
```

### 2. Criar mapa de tradução combinando status padrões e customizados

```typescript
const statusNameMap = useMemo(() => {
  const map: Record<string, string> = {
    // Status padrões (por slug)
    draft: "Briefing",
    in_creation: "Em Criação", 
    pending_approval: "Aguardando Aprovação",
    approved: "Aprovado",
    published: "Publicado",
    rejected: "Rejeitado",
  };
  
  // Adicionar status customizados (por ID e por slug)
  customStatuses.forEach(status => {
    map[status.id] = status.name;
    map[status.slug] = status.name;
  });
  
  return map;
}, [customStatuses]);
```

### 3. Função para traduzir o texto do histórico

```typescript
const translateHistoryAction = (entry: any): string => {
  if (entry.action) {
    // Verificar se o action contém um UUID ou slug que precisa ser traduzido
    // Formato: "Status alterado para: {status}"
    const match = entry.action.match(/Status alterado para:\s*(.+)$/);
    if (match) {
      const statusValue = match[1].trim();
      const translatedName = statusNameMap[statusValue] || statusValue;
      return `Status alterado para: ${translatedName}`;
    }
    return entry.action;
  }
  
  // Fallback: traduzir entry.status diretamente
  const translatedStatus = statusNameMap[entry.status] || entry.status;
  return `Status: ${translatedStatus}`;
};
```

### 4. Atualizar renderização do histórico

```tsx
{/* Antes */}
<p className="text-sm">{entry.action || `Status: ${entry.status}`}</p>

{/* Depois */}
<p className="text-sm">{translateHistoryAction(entry)}</p>
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| "Status alterado para: 33efe0b1-624b-42bb-af1c-af1b53903415" | "Status alterado para: Aguardando Aprovação" |
| "Status: pending_approval" | "Status: Aguardando Aprovação" |

---

## Benefícios

1. **Corrige dados históricos** - Posts com UUID no histórico serão exibidos corretamente
2. **Suporta status customizados** - Status criados pela agência também serão traduzidos
3. **Fallback seguro** - Se não encontrar tradução, mantém o valor original
