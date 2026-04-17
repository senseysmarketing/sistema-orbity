

# Implementação Drill-down `CRMSettings` — 2 Guardrails

## Mudanças em `src/components/crm/CRMSettings.tsx`

### Estrutura
```tsx
type View = 'hub' | 'status' | 'scoring' | 'whatsapp' | 'sources' | 'investments';
const [view, setView] = useState<View>('hub');
const containerRef = useRef<HTMLDivElement>(null);

// Guardrail #2: reset scroll ao trocar view
useEffect(() => {
  containerRef.current?.scrollTo({ top: 0 });
  // fallback: subir o sheet pai também
  containerRef.current?.closest('[role="dialog"]')?.scrollTo({ top: 0 });
}, [view]);
```

### Hub view (`view === 'hub'`)
Grid `grid-cols-1 gap-4` com 5 cards clicáveis (mesmos ícones/títulos/descrições atuais). Cada card: `onClick={() => setView('xxx')}`.

### Sub-view (`view !== 'hub'`)
```tsx
<div ref={containerRef}>
  <Button variant="ghost" onClick={() => setView('hub')}
    className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
  </Button>
  {/* ✅ Guardrail #1: SEM título/descrição extras — componente filho controla a sua tipografia */}
  {view === 'status' && <CustomStatusManager />}
  {view === 'scoring' && <LeadScoringConfig />}
  {view === 'whatsapp' && <WhatsAppTemplateManager />}
  {view === 'sources' && (<><MetaIntegrationConfig /><Separator className="my-6" /><WebhooksManager /></>)}
  {view === 'investments' && <ManualInvestmentManager />}
</div>
```

### Imports
- Remover: `Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger`
- Adicionar: `useState, useRef, useEffect, Button, ArrowLeft`
- Manter: `Card, CardHeader, CardTitle, CardDescription, Separator` + ícones existentes + 5 managers

## Guardrails

| # | Garantia | Aplicação |
|---|---|---|
| 1 | Sem títulos duplicados | Sub-view renderiza apenas `<Button Voltar>` + filho. Nenhum `<h3>` extra. |
| 2 | Reset de scroll | `useEffect([view])` rola `containerRef` e o `[role="dialog"]` pai para o topo. |

## Ficheiro alterado
- `src/components/crm/CRMSettings.tsx` (refatoração completa)

Sem migrations. Sem mudanças em queries/edges/outros componentes.

