

# Implementação: Mover Settings para Side Sheet + Guardrail de estado residual

## Investigação rápida do estado `activeTab`

Preciso confirmar como `activeTab` é inicializado em `src/pages/CRM.tsx` antes de aplicar o guardrail. Vou verificar:
- Se há leitura de `searchParams` (`?tab=settings`)
- Se há `localStorage` para persistência
- Default atual (`'dashboard'`)

## Mudanças

### 1. Imports (`src/pages/CRM.tsx`)
- Adicionar `Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger` de `@/components/ui/sheet`
- `Settings`, `Plus` já importados

### 2. Guardrail de estado residual
Imediatamente após ler o valor inicial de `activeTab` (de `searchParams`/`localStorage`/default), aplicar:

```ts
const rawTab = searchParams.get('tab') ?? localStorage.getItem('crm:activeTab') ?? 'dashboard';
const initialTab = rawTab === 'settings' ? 'dashboard' : rawTab;
const [activeTab, setActiveTab] = useState(initialTab);
```

Também sanear em `useEffect` se `setActiveTab('settings')` for chamado externamente (defensivo): no `onValueChange` do `<Tabs>`, ignorar `'settings'`.

Se a leitura atual for apenas `useState('dashboard')` sem persistência, o guardrail é trivial mas mantemos a checagem para futura compatibilidade.

### 3. Tabs (linhas ~417-431)
- `grid-cols-3` → `grid-cols-2`
- Remover `<TabsTrigger value="settings">`

### 4. Conteúdo (linhas ~590-593)
- Remover bloco `<TabsContent value="settings">` inteiro

### 5. Header — botão de engrenagem
Envolver "Novo Lead" + Settings Sheet em `<div className="flex gap-2">`:

```tsx
<div className="flex gap-2">
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" size="icon" title="Configurações do CRM">
        <Settings className="h-4 w-4 text-muted-foreground" />
      </Button>
    </SheetTrigger>
    <SheetContent side="right" className="w-full sm:max-w-[800px] md:max-w-[1000px] overflow-y-auto border-l">
      <SheetHeader className="mb-6">
        <SheetTitle className="text-2xl font-bold">Configurações do CRM</SheetTitle>
      </SheetHeader>
      <CRMSettings />
    </SheetContent>
  </Sheet>
  {/* Dialog Novo Lead existente */}
</div>
```

## Guardrails

| # | Garantia | Como |
|---|----------|------|
| 1 | Sem ecrã em branco | `initialTab` reescreve `'settings'` → `'dashboard'` |
| 2 | Defensivo no handler | `onValueChange` ignora valor `'settings'` |
| 3 | Aninhamento Sheet ok | Radix Portals isolam z-index |
| 4 | Sem perda de feature | Settings acessíveis via engrenagem |
| 5 | Mobile | Sheet `w-full` em telas pequenas |

## Ficheiro alterado
- `src/pages/CRM.tsx` (5 edições pontuais: imports, init state guardrail, tabs grid, remove TabsTrigger, remove TabsContent, header com Sheet)

Sem migration. Sem mudança em `CRMSettings.tsx`.

