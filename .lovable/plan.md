

# Filtro de clientes do Calendário Social — incluir "Agência (Interno)"

## Diagnóstico
Em `src/components/social-media/SocialMediaCalendar.tsx`, o popover "Clientes" lista apenas `clients` reais da tabela `clients`. Posts internos da agência (criados como tarefas `redes_sociais` sem `client_id`) ficam invisíveis ao filtro — não dá para isolá-los.

Nas tarefas, isso já é resolvido via `getVirtualAgencyClient()` (`src/lib/virtualAgencyClient.ts`), que cria um pseudo-cliente com id `agency:{agencyId}` e nome `"{Agência} (Interno)"`.

## Mudança (apenas `src/components/social-media/SocialMediaCalendar.tsx`)

### 1. Imports
```ts
import { getVirtualAgencyClient, isVirtualAgencyClient } from "@/lib/virtualAgencyClient";
```

### 2. Lista de clientes do filtro — prepend do virtual
Logo após o `useQuery` de `clients`, derivar a lista exibida no popover:
```ts
const clientsWithAgency = currentAgency
  ? [getVirtualAgencyClient({ id: currentAgency.id, name: currentAgency.name }), ...clients]
  : clients;
```
E renderizar `clientsWithAgency.map(...)` no popover (em vez de `clients.map`).

### 3. Lógica de match em `getFilteredPostsForDate`
Substituir:
```ts
const matchesClient = clientFilter.length === 0 || clientFilter.includes(task.client_id || '');
```
por:
```ts
const hasAgencyFilter = clientFilter.some(isVirtualAgencyClient);
const realClientFilter = clientFilter.filter(id => !isVirtualAgencyClient(id));
const isInternalPost = !task.client_id;

const matchesClient =
  clientFilter.length === 0 ||
  (hasAgencyFilter && isInternalPost) ||
  (task.client_id && realClientFilter.includes(task.client_id));
```

### 4. Visual coerente
Manter o mesmo `Checkbox + nome` do popover atual. O virtual aparecerá como **"{Nome da Agência} (Interno)"** no topo, igual à imagem `image-234.png` mostrada nas tarefas.

## Garantias
| # | Garantia |
|---|---|
| 1 | Filtro "Agência (Interno)" sempre no topo, isolando posts internos. |
| 2 | Pode combinar com clientes reais (multi-select OR). |
| 3 | Sem mudanças em `useSocialMediaTasks`, schema, edges ou outras telas. |
| 4 | Reutiliza o helper já existente — coerência com tarefas/reuniões. |

## Ficheiros alterados
- `src/components/social-media/SocialMediaCalendar.tsx`

Sem migrations. Sem novas dependências.

