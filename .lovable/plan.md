
# Otimizacao Mobile: Abas Restantes do Social Media

## Problemas Identificados (Screenshot)

| Problema | Componente | Causa |
|----------|------------|-------|
| Tabs de configuracoes empilhadas | `SocialMediaSettings.tsx` | `TabsList` usa `grid-cols-2 lg:grid-cols-7` que empilha 7 tabs em 2 colunas no mobile |
| Kanban com filtros quebrados | `PostKanban.tsx` | Filtros em linha unica sem scroll horizontal, `w-[180px]` fixo nos selects |
| Analytics header desorganizado | `SocialMediaAnalytics.tsx` | Header com titulo e navegacao de mes em linha unica que quebra |

---

## Solucao

### 1. SocialMediaSettings.tsx - Tabs com Scroll Horizontal

**Problema atual:**
```tsx
<TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
```

**Solucao:** Aplicar mesmo padrao do `Settings.tsx` (ja ajustado) - scroll horizontal com icones:

```tsx
import { 
  Layers, Type, Share2, CheckSquare, 
  FileText, Clock, CalendarClock 
} from "lucide-react";

<TabsList className="flex w-full overflow-x-auto scrollbar-hide">
  <TabsTrigger value="statuses" className="flex-shrink-0 gap-1 md:gap-2">
    <Layers className="h-4 w-4" />
    <span className="hidden sm:inline">Status</span>
  </TabsTrigger>
  <TabsTrigger value="content-types" className="flex-shrink-0 gap-1 md:gap-2">
    <Type className="h-4 w-4" />
    <span className="hidden sm:inline">Tipos</span>
  </TabsTrigger>
  <TabsTrigger value="platforms" className="flex-shrink-0 gap-1 md:gap-2">
    <Share2 className="h-4 w-4" />
    <span className="hidden sm:inline">Plataformas</span>
  </TabsTrigger>
  <TabsTrigger value="approval" className="flex-shrink-0 gap-1 md:gap-2">
    <CheckSquare className="h-4 w-4" />
    <span className="hidden sm:inline">Aprovacao</span>
  </TabsTrigger>
  <TabsTrigger value="templates" className="flex-shrink-0 gap-1 md:gap-2">
    <FileText className="h-4 w-4" />
    <span className="hidden sm:inline">Templates</span>
  </TabsTrigger>
  <TabsTrigger value="schedule" className="flex-shrink-0 gap-1 md:gap-2">
    <Clock className="h-4 w-4" />
    <span className="hidden sm:inline">Horarios</span>
  </TabsTrigger>
  <TabsTrigger value="deadlines" className="flex-shrink-0 gap-1 md:gap-2">
    <CalendarClock className="h-4 w-4" />
    <span className="hidden sm:inline">Prazos</span>
  </TabsTrigger>
</TabsList>
```

**Tambem ajustar o header:**
```tsx
<div>
  <h2 className="text-xl md:text-2xl font-bold">Configuracoes de Social Media</h2>
  <p className="text-sm text-muted-foreground">
    Personalize seu fluxo de trabalho e preferencias de postagem
  </p>
</div>
```

---

### 2. PostKanban.tsx - Filtros Responsivos

**Problema atual:**
- Filtros em linha unica com `flex-wrap` que quebra mal no mobile
- Selects com largura fixa `w-[180px]`
- Muitos elementos em uma area pequena

**Solucao:** Reorganizar filtros em scroll horizontal compacto igual ao calendario:

```tsx
<div className="space-y-3 flex-shrink-0">
  {/* Linha 1: Titulo + Botao Nova Postagem */}
  <div className="flex items-center justify-between">
    <h2 className="text-xl md:text-2xl font-bold">Kanban de Producao</h2>
    <Button onClick={() => setIsCreateDialogOpen(true)} className="h-9">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline ml-2">Nova Postagem</span>
    </Button>
  </div>
  
  {/* Linha 2: Filtros com scroll horizontal */}
  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
    <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    
    <Select value={filterClient} onValueChange={setFilterClient}>
      <SelectTrigger className="w-[130px] sm:w-[160px] h-9 text-xs sm:text-sm flex-shrink-0">
        <SelectValue placeholder="Cliente" />
      </SelectTrigger>
      ...
    </Select>

    <Select value={filterContentType} onValueChange={setFilterContentType}>
      <SelectTrigger className="w-[100px] sm:w-[140px] h-9 text-xs sm:text-sm flex-shrink-0">
        <SelectValue placeholder="Tipo" />
      </SelectTrigger>
      ...
    </Select>

    <Select value={filterUser} onValueChange={setFilterUser}>
      <SelectTrigger className="w-[110px] sm:w-[150px] h-9 text-xs sm:text-sm flex-shrink-0">
        <SelectValue placeholder="Usuario" />
      </SelectTrigger>
      ...
    </Select>

    <DateRangeFilterDialog ... className="flex-shrink-0" />

    <Select value={sortBy} onValueChange={...}>
      <SelectTrigger className="w-[120px] sm:w-[160px] h-9 text-xs sm:text-sm flex-shrink-0">
        ...
      </SelectTrigger>
      ...
    </Select>

    {hasActiveFilters && (
      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 flex-shrink-0">
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>
</div>
```

---

### 3. SocialMediaAnalytics.tsx - Header Responsivo

**Problema atual:**
- Header com titulo e navegacao de mes em `flex justify-between` que quebra no mobile
- Cards com grids que podem ficar apertados

**Solucao:** Stack vertical no mobile:

```tsx
{/* Header com seletor de mes */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div>
    <h2 className="text-xl md:text-2xl font-bold">Analises e Insights</h2>
    <p className="text-sm text-muted-foreground">
      Visao geral do desempenho e status das postagens
    </p>
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
```

**Ajustar grids de cards:**
```tsx
{/* Cards principais - 2 colunas no mobile, 4 no desktop */}
<div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
  ...
</div>

{/* Cards de agendamentos - 1 coluna no mobile */}
<div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
  ...
</div>

{/* Cards de estatisticas - 1 coluna no mobile, 3 no desktop */}
<div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
  ...
</div>
```

---

## Arquivos a Modificar

| Arquivo | Mudancas |
|---------|----------|
| `src/components/social-media/SocialMediaSettings.tsx` | TabsList com scroll horizontal e icones |
| `src/components/social-media/PostKanban.tsx` | Filtros reorganizados em 2 linhas com scroll |
| `src/components/social-media/SocialMediaAnalytics.tsx` | Header responsivo, grids otimizados |

---

## Resultado Visual (Mobile)

### Settings (Antes vs Depois)
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌───────────────────┐
│ Status  │  Tipos  │           │ [≡][T][↗][✓][📄]→│
│ Plataf  │ Aprov   │           │  (scroll horiz)   │
│ Templ   │ Horár   │           └───────────────────┘
│ Prazos  │         │           
└───────────────────┘           
```

### Kanban (Antes vs Depois)
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌───────────────────┐
│ Kanban de Prod    │           │ Kanban      [+ ]  │
│ 🔍[Cliente    ▼]  │           │ 🔍[Cli▼][Tip▼]→   │
│   [Tipo      ▼]   │           │  (scroll horiz)   │
│   [Usuario  ▼]    │           └───────────────────┘
│   [Periodo  ▼]    │           
│   [Ordenar  ▼]    │           
│   + Nova Postagem │           
└───────────────────┘           
```

### Analytics (Antes vs Depois)
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌───────────────────┐
│ Analises  ← Jan → │           │ Analises e Ins.   │
│ (quebra)          │           │ Visao geral...    │
└───────────────────┘           │ ← Jan 2026 →      │
                                └───────────────────┘
```

---

## Resumo das Mudancas

| Componente | Antes | Depois |
|------------|-------|--------|
| Settings tabs | Grid 2 colunas empilhadas | Scroll horizontal + icones |
| Kanban filtros | flex-wrap bagunçado | 2 linhas, scroll horizontal |
| Kanban selects | 180px fixo | 100-160px responsivo |
| Analytics header | 1 linha que quebra | Stack vertical no mobile |
| Analytics grids | Fixos | Responsivos (1-2-4 cols) |
