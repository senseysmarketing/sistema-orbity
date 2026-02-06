

# Melhorias no Painel de Planejamento Semanal

## Resumo das Alteracoes

1. **Ordenacao de clientes**: Mostrar primeiro quem tem mais posts, depois menos, e por ultimo sem posts
2. **Sheet lateral maior**: Ocupar mais altura da tela, com scroll apenas quando necessario
3. **Traducao de status**: Remover codigos em ingles, mostrar nomes amigaveis em portugues

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/social-media/WeeklyPlanningView.tsx` | Ajustar ordenacao |
| `src/components/social-media/planning/ClientPlanningDetails.tsx` | Altura do Sheet + traducao de status |
| `src/components/social-media/planning/types.ts` | Adicionar mapa de traducao de status |

---

## 1. Nova Ordenacao (WeeklyPlanningView.tsx)

**Antes:**
```typescript
.sort((a, b) => {
  if (a.hasOverdue && !b.hasOverdue) return -1;
  if (a.weekTotal === 0 && b.weekTotal > 0) return -1;  // Sem posts primeiro
  // ...
})
```

**Depois:**
```typescript
.sort((a, b) => {
  // 1. Clientes COM posts primeiro (ordenados do maior para menor)
  if (a.weekTotal > 0 && b.weekTotal === 0) return -1;
  if (a.weekTotal === 0 && b.weekTotal > 0) return 1;
  
  // 2. Entre clientes com posts: ordenar por quantidade (maior primeiro)
  if (a.weekTotal !== b.weekTotal) {
    return b.weekTotal - a.weekTotal;
  }
  
  // 3. Alfabetico como desempate
  return a.clientName.localeCompare(b.clientName);
})
```

---

## 2. Sheet Lateral Maior (ClientPlanningDetails.tsx)

Alterar o `SheetContent` para ocupar altura total e o `ScrollArea` para usar altura dinamica:

```tsx
<SheetContent className="w-full sm:max-w-md flex flex-col h-full">
  {/* ... header ... */}
  
  <div className="mt-6 flex-1 flex flex-col min-h-0 space-y-6">
    {/* Summary section */}
    
    {/* Posts section - flex-1 para ocupar espaco restante */}
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      <h4 className="text-sm font-medium shrink-0">Posts da Semana</h4>
      <ScrollArea className="flex-1">
        {/* lista de posts */}
      </ScrollArea>
    </div>
    
    {/* Quick actions - sempre no rodape */}
    <div className="shrink-0 space-y-2 pt-4 border-t">
      {/* botao criar post */}
    </div>
  </div>
</SheetContent>
```

---

## 3. Traducao de Status (types.ts + ClientPlanningDetails.tsx)

### Adicionar mapa de traducao em types.ts:

```typescript
export const STATUS_DISPLAY_LABELS: Record<string, string> = {
  // Ingles -> Portugues
  draft: 'Briefing',
  briefing: 'Briefing',
  in_creation: 'Em Criacao',
  pending_approval: 'Aguardando Aprovacao',
  approved: 'Aprovado',
  published: 'Publicado',
  revision: 'Em Revisao',
  
  // Ja em portugues (manter)
  rascunho: 'Briefing',
  em_criacao: 'Em Criacao',
  aguardando_aprovacao: 'Aguardando Aprovacao',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
  revisao: 'Em Revisao',
};

export function translateStatus(status: string): string {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  return STATUS_DISPLAY_LABELS[normalized] || status;
}
```

### Usar no ClientPlanningDetails.tsx:

```tsx
import { translateStatus, categorizeStatus } from "./types";

const getStatusBadge = (status: string) => {
  const category = categorizeStatus(status);
  const displayLabel = translateStatus(status);  // <-- traduz
  const colors = {
    ready: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    inProgress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    draft: "bg-muted text-muted-foreground",
  };
  return <Badge className={colors[category]}>{displayLabel}</Badge>;  // <-- mostra traduzido
};
```

---

## Resultado Visual

### Ordenacao
| Posicao | Cliente | Posts |
|---------|---------|-------|
| 1 | XYZ Corp | 7 |
| 2 | Space Imob | 4 |
| 3 | ABC Marketing | 1 |
| 4 | Empresa Nova | 0 |

### Status Traduzidos
| Antes | Depois |
|-------|--------|
| `draft` | Briefing |
| `in_creation` | Em Criacao |
| `pending_approval` | Aguardando Aprovacao |
| `approved` | Aprovado |
| `published` | Publicado |

### Sheet Lateral
- Altura total da tela (flex h-full)
- Scroll apenas se a lista de posts for maior que o espaco disponivel
- Botao "Criar Post" sempre visivel no rodape

