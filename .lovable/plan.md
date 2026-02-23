

# Corrigir drag-and-drop do CRM Kanban

## Problema

Ao soltar um lead sobre outro card (e nao diretamente na area vazia da coluna), o `over.id` retorna o UUID do card de destino, nao o statusKey da coluna. O codigo atual verifica se `over.id` e um status valido e, como nao e, descarta o evento silenciosamente.

O Kanban de Social Media ja resolve isso buscando o `containerId` do sortable context. O CRM Kanban precisa da mesma logica.

## Solucao

Alterar `handleDragEnd` em `src/components/crm/LeadsKanban.tsx` para:

1. Verificar se `over.id` e um statusKey valido
2. Se nao for, buscar `over.data.current?.sortable?.containerId` (que e o ID da coluna pai)
3. Usar esse containerId como o novo status

## Mudanca tecnica

Arquivo: `src/components/crm/LeadsKanban.tsx`, funcao `handleDragEnd` (linhas 156-218)

Substituir a logica de resolucao do `newStatus`:

```ts
// Atual (quebrado):
const newStatus = over.id as string;
if (!statusConfig[newStatus]) { return; }

// Corrigido:
let newStatus = over.id as string;

if (!statusConfig[newStatus]) {
  // over.id e um card — buscar a coluna pai via sortable context
  const containerId = over.data.current?.sortable?.containerId;
  if (containerId && statusConfig[containerId]) {
    newStatus = containerId;
  } else {
    setActiveId(null);
    setDraggedLead(null);
    return;
  }
}
```

Tambem ajustar a comparacao de status atual do lead (linha 176) para usar `normalizeStatusToDb` e comparar com `dbStatus` da coluna de destino, evitando falsos "sem mudanca":

```ts
const displayStatus = statusConfig[newStatus].title;
const dbStatus = mapDisplayStatusToDatabase(displayStatus);
const currentNormalized = normalizeStatusToDb(lead.status);

if (currentNormalized.toLowerCase() === dbStatus.toLowerCase()) {
  // Mesmo status, nao faz nada
  setActiveId(null);
  setDraggedLead(null);
  return;
}
```

Nenhum outro arquivo precisa ser alterado.

