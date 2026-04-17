

# Sheet com largura dinâmica por view

## Diagnóstico

O `<SheetContent>` em `src/pages/CRM.tsx` (linha ~402) usa a largura padrão do componente sheet — que é `sm:max-w-sm` (~384px). Para hub/status/scoring isso é confortável, mas para `whatsapp` (que tem flow + editor + live preview lado a lado) e `sources` (Meta + Webhooks) fica espremido.

A largura é controlada **no `SheetContent` pai** (`CRM.tsx`), não no `CRMSettings`. Mas o `CRMSettings` é quem sabe qual view está ativa. Solução: o `CRMSettings` expõe a view atual via callback, e o `CRM.tsx` aplica a classe de largura correspondente.

## Solução: largura responsiva por view

### Mapa de larguras
| View | Largura | Justificativa |
|---|---|---|
| `hub` | `sm:max-w-md` (~448px) | Grid de cards, leitura confortável |
| `status` | `sm:max-w-lg` (~512px) | Lista de etapas |
| `scoring` | `sm:max-w-2xl` (~672px) | Tabela de regras com colunas |
| `whatsapp` | `sm:max-w-5xl` (~1024px) | Flow + Editor + Live Preview |
| `sources` | `sm:max-w-3xl` (~768px) | Forms Meta + Webhooks |
| `investments` | `sm:max-w-2xl` (~672px) | Tabela de investimentos |

Transição suave com `transition-[max-width] duration-300`.

### Mudanças

**1. `src/components/crm/CRMSettings.tsx`**
- Adicionar prop opcional `onViewChange?: (view: View) => void`.
- Disparar callback no `useEffect([view])` (já existente) e no `setView` inicial.

**2. `src/pages/CRM.tsx`**
- Adicionar `useState<View>('hub')` para rastrear a view atual do CRMSettings.
- Mapa `viewWidthMap` com as classes acima.
- Aplicar a classe ao `<SheetContent className={cn("overflow-y-auto transition-[max-width] duration-300", viewWidthMap[crmSettingsView])}>`.
- Resetar para `'hub'` quando o sheet fechar (`onOpenChange`).

### Guardrails
- **Sem nested sheets**: continuamos com 1 único Sheet pai.
- **Mobile**: o `w-3/4` base do sheet (definido em `sheet.tsx`) garante que em telas pequenas fica fluido — `sm:max-w-*` só atua em ≥640px.
- **Sem flicker**: `transition-[max-width]` faz o redimensionamento ser suave ao navegar entre views.

## Ficheiros alterados
- `src/components/crm/CRMSettings.tsx` (+1 prop, +1 chamada de callback)
- `src/pages/CRM.tsx` (+1 state, +1 mapa, +1 classe dinâmica no SheetContent)

Sem migration. Sem mudanças em queries/edges/outros componentes.

