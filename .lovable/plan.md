

# Otimizacao Mobile: Tela de Tarefas (Tasks)

## Problemas Identificados (Screenshot)

| Problema | Local | Causa |
|----------|-------|-------|
| Header quebrado | `Tasks.tsx` linhas 811-816 | Titulo e botoes em `flex justify-between` sem responsividade |
| Filtros empilhados verticalmente | `Tasks.tsx` linhas 1003-1091 | `flex-wrap` com selects `w-[180px]` fixos |
| Search input muito largo | `Tasks.tsx` linha 1004 | `min-w-[200px]` ocupa linha inteira |
| Tabs de configuracoes sem scroll | `Tasks.tsx` linhas 1159-1173 | `TabsList` basico sem `overflow-x-auto` |
| Analytics header quebrado | `TaskAnalytics.tsx` linhas 232-256 | `flex justify-between` que quebra no mobile |

---

## Solucao

### 1. Tasks.tsx - Header Responsivo

**Problema atual (linha 811-816):**
```tsx
<div className="flex justify-between items-center">
  <div>
    <h1 className="text-3xl font-bold tracking-tight">Gestao de Tarefas</h1>
    <p className="text-muted-foreground">Painel completo...</p>
  </div>
  <div className="flex items-center gap-2">
    {/* Templates + Nova Tarefa */}
  </div>
</div>
```

**Solucao:** Stack vertical no mobile:

```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestao de Tarefas</h1>
    <p className="text-sm md:text-base text-muted-foreground">Painel completo...</p>
  </div>
  <div className="flex items-center gap-2">
    {templates.length > 0 && (
      <QuickTemplatesDropdown ... />
    )}
    <Button className="flex items-center gap-2 h-9">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Nova Tarefa</span>
    </Button>
  </div>
</div>
```

---

### 2. Tasks.tsx - Filtros com Scroll Horizontal

**Problema atual (linhas 1003-1091):**
```tsx
<div className="flex flex-wrap gap-4">
  <div className="relative flex-1 min-w-[200px]">
    <Input ... />
  </div>
  <Select ...><SelectTrigger className="w-[180px]">...</SelectTrigger></Select>
  <!-- Varios selects com w-[180px] -->
</div>
```

**Solucao:** Reorganizar em 2 linhas com scroll horizontal:

```tsx
{/* Linha 1: Busca isolada */}
<div className="relative">
  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Buscar tarefas..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="pl-8"
  />
</div>

{/* Linha 2: Filtros com scroll horizontal */}
<div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
  <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
  
  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
    <SelectTrigger className="w-[130px] sm:w-[150px] h-9 text-xs sm:text-sm flex-shrink-0">
      <SelectValue placeholder="Prioridade" />
    </SelectTrigger>
    ...
  </Select>
  
  <Select value={assignedFilter} onValueChange={setAssignedFilter}>
    <SelectTrigger className="w-[120px] sm:w-[150px] h-9 text-xs sm:text-sm flex-shrink-0">
      <SelectValue placeholder="Usuario" />
    </SelectTrigger>
    ...
  </Select>
  
  <Select value={clientFilter} onValueChange={setClientFilter}>
    <SelectTrigger className="w-[120px] sm:w-[150px] h-9 text-xs sm:text-sm flex-shrink-0">
      <SelectValue placeholder="Cliente" />
    </SelectTrigger>
    ...
  </Select>
  
  <Select value={typeFilter} onValueChange={setTypeFilter}>
    <SelectTrigger className="w-[110px] sm:w-[140px] h-9 text-xs sm:text-sm flex-shrink-0">
      <SelectValue placeholder="Tipo" />
    </SelectTrigger>
    ...
  </Select>
  
  <div className="flex-shrink-0">
    <DateRangeFilterDialog ... />
  </div>
  
  {hasActiveFilters && (
    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 flex-shrink-0">
      <X className="h-4 w-4" />
    </Button>
  )}
</div>
```

---

### 3. Tasks.tsx - Tabs de Configuracoes com Scroll Horizontal

**Problema atual (linhas 1159-1173):**
```tsx
<TabsList>
  <TabsTrigger value="templates">Templates</TabsTrigger>
  <TabsTrigger value="types">Tipos</TabsTrigger>
  <TabsTrigger value="statuses">Status</TabsTrigger>
</TabsList>
```

**Solucao:** Adicionar scroll horizontal e ocultar labels no mobile:

```tsx
<TabsList className="flex w-full overflow-x-auto scrollbar-hide">
  <TabsTrigger value="templates" className="flex-shrink-0 gap-1 md:gap-2">
    <FileText className="h-4 w-4" />
    <span className="hidden sm:inline">Templates</span>
  </TabsTrigger>
  <TabsTrigger value="types" className="flex-shrink-0 gap-1 md:gap-2">
    <Tag className="h-4 w-4" />
    <span className="hidden sm:inline">Tipos</span>
  </TabsTrigger>
  <TabsTrigger value="statuses" className="flex-shrink-0 gap-1 md:gap-2">
    <Settings className="h-4 w-4" />
    <span className="hidden sm:inline">Status</span>
  </TabsTrigger>
</TabsList>
```

---

### 4. TaskAnalytics.tsx - Header Responsivo

**Problema atual (linhas 232-256):**
```tsx
<div className="flex items-center justify-between">
  <div>
    <h2 className="text-2xl font-bold">Analises e Insights</h2>
    <p className="text-muted-foreground">Visao geral...</p>
  </div>
  <div className="flex items-center gap-2">
    <!-- Navegacao de mes -->
  </div>
</div>
```

**Solucao:** Stack vertical no mobile + ajustar grids:

```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div>
    <h2 className="text-xl md:text-2xl font-bold">Analises e Insights</h2>
    <p className="text-sm text-muted-foreground">Visao geral do desempenho e status das tarefas</p>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="icon" onClick={handlePreviousMonth} className="h-9 w-9">
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <div className="min-w-[130px] sm:min-w-[150px] text-center">
      <span className="text-sm sm:text-lg font-semibold capitalize">
        {format(selectedMonth, "MMM yyyy", { locale: ptBR })}
      </span>
    </div>
    <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-9 w-9">
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
</div>

{/* Cards principais - 2 colunas no mobile, 4 no desktop */}
<div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
  ...
</div>

{/* Cards de detalhes - 1 coluna no mobile, 2 no desktop */}
<div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
  ...
</div>

{/* Cards estatisticos - 2 colunas no mobile, 4 no desktop */}
<div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
  ...
</div>
```

---

## Arquivos a Modificar

| Arquivo | Mudancas |
|---------|----------|
| `src/pages/Tasks.tsx` | Header responsivo, filtros em scroll horizontal, tabs de config com scroll |
| `src/components/tasks/TaskAnalytics.tsx` | Header responsivo, grids otimizados |

---

## Resultado Visual (Mobile)

### Header (Antes vs Depois)
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌───────────────────┐
│ Gestao  [Templ▼]  │           │ Gestao de Tarefas │
│ de      [+Nova]   │           │ Painel completo...│
│ Tarefas           │           │ [Templ▼] [+]      │
│ Painel...         │           └───────────────────┘
└───────────────────┘           
```

### Filtros (Antes vs Depois)
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌───────────────────┐
│ 🔍 Buscar...      │           │ 🔍 Buscar tarefas │
│ [Todas Priorid▼]  │           │ 🔍[Pri▼][Usr▼]→   │
│ [Todos Usuarios▼] │           │  (scroll horiz)   │
│ [Todos Clientes▼] │           └───────────────────┘
│ [Todos Tipos  ▼]  │           
│ [Periodo      ▼]  │           
└───────────────────┘           
```

### Tabs de Config (Antes vs Depois)
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌───────────────────┐
│ [Templates][Tipos]│           │ [📄][🏷️][⚙️]    │
│ [Status]          │           │  (icones apenas)  │
└───────────────────┘           └───────────────────┘
```

---

## Resumo das Mudancas

| Componente | Antes | Depois |
|------------|-------|--------|
| Header | 1 linha que quebra | Stack vertical no mobile |
| Botao Nova Tarefa | "Nova Tarefa" | Só icone + no mobile |
| Busca | min-w-[200px] flex-1 | Input simples em linha propria |
| Filtros | flex-wrap, w-[180px] | scroll horizontal, w-[110-150px] |
| Tabs config | Sem scroll | scroll horizontal + icones |
| Analytics header | 1 linha | Stack vertical no mobile |
| Analytics grids | Fixos | Responsivos (2-4 cols) |

