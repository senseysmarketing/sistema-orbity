

# Configurações de Tarefas → Sheet lateral com hub de cards (padrão CRM)

## Objetivo
Replicar o padrão do CRM na tela de Tarefas: remover a aba **"Configurações"**, adicionar um **ícone de engrenagem** ao lado dos botões "Nova Tarefa" / "Templates" no header, e ao clicar abrir um **Sheet lateral** com um **hub de cards** (Templates, Tipos, Status). Cada card abre o gerenciador correspondente dentro do mesmo Sheet (sem aninhar modais).

## Mudança 1 — Criar `src/components/tasks/TasksSettings.tsx` (novo)

Componente espelho de `CRMSettings.tsx`, com:
- `export type TasksSettingsView = "hub" | "templates" | "types" | "statuses"`
- Prop opcional `onViewChange?: (view) => void` para o pai ajustar a largura do Sheet.
- Estado interno `view` + `containerRef` para reset de scroll ao trocar de view (mesmo guardrail do CRM).
- View `hub`: grid 1 coluna (`grid-cols-1 gap-4`) com 3 `<HubCard>` (mesmo componente local do CRM, copiado):
  - **Templates** — ícone `FileText` — "Modelos prontos para criar tarefas com 1 clique"
  - **Tipos** — ícone `Tag` — "Personalize categorias de tarefas (Design, Tráfego, etc.)"
  - **Status** — ícone `Settings` (ou `GitMerge`) — "Personalize as etapas do fluxo de tarefas"
- Demais views: botão **"Voltar"** (ArrowLeft) + render do gerenciador puro:
  - `templates` → `<TaskTemplateManager />`
  - `types` → `<TaskTypeManager />`
  - `statuses` → `<TaskStatusManager />`

Observação: esses três managers já existem e são componentes puros (sem Dialog/Sheet wrapper), então respeitam o guardrail "no nested modals".

## Mudança 2 — `src/pages/Tasks.tsx`

### a) Adicionar Sheet com gatilho no header (linhas 1380–1390)
Inserir, **antes** do `QuickTemplatesDropdown`, um botão `variant="outline" size="icon"` com ícone `Settings` que abre um `<Sheet>`:

```tsx
<Sheet
  open={tasksSettingsOpen}
  onOpenChange={(open) => {
    setTasksSettingsOpen(open);
    if (!open) setTasksSettingsView("hub");
  }}
>
  <SheetTrigger asChild>
    <Button variant="outline" size="icon" title="Configurações de Tarefas">
      <Settings className="h-4 w-4 text-muted-foreground" />
    </Button>
  </SheetTrigger>
  <SheetContent
    side="right"
    className={cn(
      "w-full overflow-y-auto border-l transition-[max-width] duration-300",
      {
        "sm:max-w-md": tasksSettingsView === "hub",
        "sm:max-w-3xl": tasksSettingsView === "templates",
        "sm:max-w-2xl": tasksSettingsView === "types" || tasksSettingsView === "statuses",
      }
    )}
  >
    <SheetHeader className="mb-6">
      <SheetTitle className="text-2xl font-bold">Configurações de Tarefas</SheetTitle>
    </SheetHeader>
    <TasksSettings onViewChange={setTasksSettingsView} />
  </SheetContent>
</Sheet>
```

### b) Estado novo (perto dos outros `useState` do componente)
```tsx
const [tasksSettingsOpen, setTasksSettingsOpen] = useState(false);
const [tasksSettingsView, setTasksSettingsView] = useState<TasksSettingsView>("hub");
```

### c) Imports a adicionar
- `Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger` de `@/components/ui/sheet`
- `cn` de `@/lib/utils`
- `TasksSettings, type TasksSettingsView` do novo arquivo

### d) Remover a aba "Configurações" do `<Tabs>` principal
- Linhas 1791–1805: trocar `grid-cols-3` por `grid-cols-2` e remover o `<TabsTrigger value="settings">`.
- Linhas 2075–2101: remover o bloco inteiro `<TabsContent value="settings">…</TabsContent>` (todo o sub-Tabs interno).

## Não-mexer
- `TaskTemplateManager`, `TaskTypeManager`, `TaskStatusManager`: já são componentes puros, ficam intactos.
- Lógica de criação/edição de tarefa, dialogs existentes, drag-and-drop, filtros.
- Aba "Análises" continua ativa.
- O `TasksSettings` segue o mesmo guardrail "no nested modals" do CRM (forms abrem inline dentro do próprio Sheet, não em Dialog separado).

## Resultado esperado
- Header de Tarefas: `[⚙️] [Templates ▾] [+ Nova Tarefa]` (engrenagem à esquerda do dropdown de templates).
- Clique na engrenagem → Sheet lateral abre com hub de 3 cards.
- Clique em um card → mesmo Sheet expande largura e mostra gerenciador com botão "Voltar".
- Apenas 1 Sheet aberto por vez (sem nested), idêntico ao padrão consolidado do CRM.

