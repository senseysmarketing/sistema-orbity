

# Fix: Pipeline some ao trocar abas no CRM

## Problema
Ao trocar de aba (Dashboard → Pipeline → Settings), o `TabsContent` desmonta o conteúdo. Quando o Pipeline remonta, o hook `useLeadStatuses()` dentro de `LeadsKanban` refaz o fetch dos status. Durante esse fetch, `statusConfig` fica vazio = zero colunas renderizadas = tela "vazia" até o fetch completar.

## Solucao

### `src/pages/CRM.tsx`

Adicionar `forceMount` nos 3 `TabsContent` e controlar visibilidade via CSS. Isso mantém os componentes montados, evitando re-fetch ao trocar abas.

```tsx
<TabsContent value="dashboard" className="space-y-4" forceMount className={cn("space-y-4", /* hidden when inactive */)}>
```

Padrão concreto — usar o Tabs com estado controlado + `forceMount` + `hidden`:

1. Trocar `<Tabs defaultValue="dashboard">` por `<Tabs value={activeTab} onValueChange={setActiveTab}>`
2. Adicionar estado: `const [activeTab, setActiveTab] = useState('dashboard')`
3. Em cada `TabsContent`, adicionar `forceMount` e classe condicional `hidden` quando inativo:
   - `<TabsContent value="pipeline" forceMount className={cn("space-y-4", activeTab !== "pipeline" && "hidden")}>`
4. Repetir para as 3 abas (dashboard, pipeline, settings)

### Resultado
Pipeline permanece montado em memória. Trocar abas é instantâneo, sem re-fetch.

### Arquivo
- `src/pages/CRM.tsx` (4-5 linhas alteradas)

