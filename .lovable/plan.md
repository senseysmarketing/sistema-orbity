
# Otimização Mobile: Calendário de Social Media

## Problemas Identificados

| Problema | Local | Impacto |
|----------|-------|---------|
| Calendário 7 colunas muito apertado | Grid `grid-cols-7` | Dias ficam ilegíveis |
| Cards de post muito pequenos | `min-h-[120px]` | Texto "Arte:" cortado |
| Header com muitos elementos | Filtros + View Mode + Botões | Quebra visual |
| Nomes dos dias ocupam espaço | "Dom", "Seg", etc. | Desperdiça espaço |
| View mode buttons largos | "Mês", "Semana", "Dia" | Não cabem na linha |

---

## Solução

### 1. Calendário Mobile - Estratégia de Layout Alternativo

**No mobile**: Usar uma visualização de **lista por semana** em vez de grid 7 colunas. Isso permite ver os posts claramente.

```tsx
// Grid responsivo:
// Mobile: 1 coluna (lista vertical por dia)
// Tablet: grid 7 colunas compacto
// Desktop: grid 7 colunas normal

<div className="grid grid-cols-1 sm:grid-cols-7 gap-1 sm:gap-2">
```

### 2. Dias da Semana Abreviados

```tsx
// Mobile: letras únicas
const weekDaysMobile = ["D", "S", "T", "Q", "Q", "S", "S"];
// Desktop: abreviações
const weekDaysDesktop = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Usar classe hidden/inline para alternar
<span className="hidden sm:inline">{weekDaysDesktop[i]}</span>
<span className="sm:hidden">{weekDaysMobile[i]}</span>
```

### 3. Header Reorganizado

**Estrutura mobile:**
- Linha 1: Navegação de mês (← Janeiro 2026 →)
- Linha 2: Botões de view mode (ícones) + Nova Postagem
- Linha 3: Filtros compactos (popover único consolidado)

```tsx
// View mode buttons como ícones no mobile
<Button variant={viewMode === "month" ? "default" : "outline"} size="icon" className="sm:hidden">
  <Grid3x3 className="h-4 w-4" />
</Button>
<Button variant={viewMode === "month" ? "default" : "outline"} className="hidden sm:flex">
  <Grid3x3 className="h-4 w-4 mr-2" />
  Mês
</Button>
```

### 4. Filtros Consolidados em Popover Único

**No mobile**: Um único botão "Filtros" que abre popover com Cliente e Status juntos.

```tsx
// Mobile: botão único de filtros
<div className="sm:hidden">
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" className="gap-2">
        <Filter className="h-4 w-4" />
        Filtros
        {hasActiveFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
      </Button>
    </PopoverTrigger>
    <PopoverContent>
      {/* Cliente + Status filters */}
    </PopoverContent>
  </Popover>
</div>

// Desktop: filtros separados (atual)
<div className="hidden sm:flex items-center gap-2">
  {/* Filtros atuais */}
</div>
```

### 5. Cards de Dia no Mobile

**Formato lista horizontal no mobile** (cada dia é uma linha):

```tsx
// Mobile: card de dia como linha horizontal
<div className="sm:hidden flex items-center gap-2 p-2 border rounded">
  <div className="font-semibold w-10">{format(day, "d")}</div>
  <div className="flex-1 flex gap-1 overflow-x-auto">
    {dayPosts.map(post => (
      <div className="w-2 h-2 rounded-full" style={{...}} title={post.title} />
    ))}
    {dayPosts.length > 0 && (
      <span className="text-xs text-muted-foreground">{dayPosts.length}</span>
    )}
  </div>
</div>

// Desktop: manter cards atuais
<div className="hidden sm:block">
  <Card ...>
</div>
```

### 6. Cards Compactos Melhorados

O texto "Arte:" fica muito pequeno. Simplificar para indicador visual apenas:

```tsx
// Ao invés de texto, usar apenas ícone colorido para due date
{effectiveDueDate && dueDateStatus && dueDateStatus.type !== 'completed' && (
  <Clock className={cn(
    "h-2.5 w-2.5 ml-auto",
    dueDateStatus.type === 'overdue' && "text-red-500",
    dueDateStatus.type === 'due_today' && "text-orange-500",
  )} />
)}
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/social-media/SocialMediaCalendar.tsx` | Layout responsivo do calendário, header reorganizado, filtros consolidados |
| `src/components/social-media/PostCard.tsx` | Card compacto simplificado para mobile |

---

## Fluxo Visual Mobile (Resultado)

```text
┌─────────────────────────────────┐
│ ← Janeiro 2026 →               │
├─────────────────────────────────┤
│ [📅][🔲][📊] [+ Nova Postagem] │
│ [🔍 Filtros ●]                  │
├─────────────────────────────────┤
│ D  S  T  Q  Q  S  S             │
├─────────────────────────────────┤
│ 28│ ● ● ● (3)                   │
│ 29│ ●     (1)                   │
│ 30│ ● ● ● ● ● (5)              │
│ ...                             │
└─────────────────────────────────┘

Clicando no dia → abre popover com lista de posts
```

---

## Implementação Detalhada

### SocialMediaCalendar.tsx - Header Responsivo

```tsx
// Importar ícones adicionais
import { Grid3x3, List, CalendarDays } from "lucide-react";

// Header reorganizado
<div className="space-y-3">
  {/* Linha 1: Navegação + View Mode + Nova Postagem */}
  <div className="flex items-center justify-between gap-2">
    {/* Navegação de mês */}
    <div className="flex items-center gap-1 sm:gap-2">
      <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <h2 className="text-base sm:text-xl font-semibold capitalize whitespace-nowrap">
        {format(selectedDate, "MMM yyyy", { locale: ptBR })}
      </h2>
      <Button variant="outline" size="icon" onClick={handleNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
    
    {/* View mode + Nova Postagem */}
    <div className="flex items-center gap-1 sm:gap-2">
      {/* View mode icons no mobile */}
      <Button
        variant={viewMode === "month" ? "default" : "outline"}
        size="icon"
        onClick={() => setViewMode("month")}
        className="h-9 w-9"
      >
        <Grid3x3 className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "week" ? "default" : "outline"}
        size="icon"
        onClick={() => setViewMode("week")}
        className="h-9 w-9"
      >
        <CalendarDays className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === "day" ? "default" : "outline"}
        size="icon"
        onClick={() => setViewMode("day")}
        className="h-9 w-9"
      >
        <List className="h-4 w-4" />
      </Button>
      
      {/* Nova Postagem - ícone no mobile, texto no desktop */}
      <Button onClick={() => setIsCreateDialogOpen(true)} className="h-9">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline ml-2">Nova Postagem</span>
      </Button>
    </div>
  </div>
  
  {/* Linha 2: Filtros */}
  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
    <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    
    {/* Filtro de Cliente */}
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm whitespace-nowrap">
          {clientFilter.length === 0 
            ? "Clientes" 
            : `${clientFilter.length}`}
        </Button>
      </PopoverTrigger>
      ...
    </Popover>
    
    {/* Filtro de Status */}
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-[120px] sm:w-[150px] h-8 text-xs sm:text-sm">
        ...
      </SelectTrigger>
    </Select>
    
    {/* Limpar filtros */}
    {hasActiveFilters && (
      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>
</div>
```

### SocialMediaCalendar.tsx - Grid do Calendário Responsivo

```tsx
{viewMode === "month" && (
  <div>
    {/* Header dos dias - responsivo */}
    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
      {["D", "S", "T", "Q", "Q", "S", "S"].map((day, i) => (
        <div key={i} className="text-center font-semibold text-xs sm:text-sm p-1 sm:p-2">
          <span className="sm:hidden">{day}</span>
          <span className="hidden sm:inline">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][i]}</span>
        </div>
      ))}
    </div>
    
    {/* Grid de dias */}
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {calendarDays.map(day => {
        const dayPosts = getFilteredPostsForDate(day);
        const isToday = isSameDay(day, new Date());
        const isCurrentMonth = isSameMonth(day, selectedDate);
        
        return (
          <Popover key={day.toISOString()}>
            <PopoverTrigger asChild>
              <div 
                className={cn(
                  "min-h-[50px] sm:min-h-[100px] p-1 sm:p-2 rounded border cursor-pointer hover:bg-muted/50 transition-colors",
                  isToday && "border-primary border-2",
                  !isCurrentMonth && "opacity-50 bg-muted/30"
                )}
              >
                {/* Número do dia */}
                <div className="text-xs sm:text-sm font-medium mb-1">
                  {format(day, "d")}
                </div>
                
                {/* Mobile: indicadores de cor */}
                <div className="flex flex-wrap gap-0.5 sm:hidden">
                  {dayPosts.slice(0, 4).map(post => (
                    <div 
                      key={post.id}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getClientColor(post.client_id) }}
                    />
                  ))}
                  {dayPosts.length > 4 && (
                    <span className="text-[8px] text-muted-foreground">+{dayPosts.length - 4}</span>
                  )}
                </div>
                
                {/* Desktop: cards de post */}
                <div className="hidden sm:block space-y-1">
                  {dayPosts.slice(0, 2).map(post => (
                    <PostCard key={post.id} post={post} compact showArchived />
                  ))}
                  {dayPosts.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{dayPosts.length - 2} mais
                    </span>
                  )}
                </div>
              </div>
            </PopoverTrigger>
            
            {/* Popover com lista de posts ao clicar */}
            {dayPosts.length > 0 && (
              <PopoverContent className="w-72 p-0" align="start">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">
                    {format(day, "d 'de' MMMM", { locale: ptBR })} ({dayPosts.length})
                  </p>
                </div>
                <ScrollArea className="max-h-60">
                  <div className="p-2 space-y-2">
                    {dayPosts.map(post => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        compact 
                        showArchived
                        onClick={() => handlePostClick(post)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            )}
          </Popover>
        );
      })}
    </div>
  </div>
)}
```

### PostCard.tsx - Compacto Simplificado

```tsx
if (compact) {
  return (
    <div 
      className={cn(
        "text-xs p-1 sm:p-1.5 rounded border cursor-pointer hover:brightness-95 transition-all",
        isArchived && "opacity-60 border-dashed"
      )}
      onClick={(e) => onClick?.(e)}
      style={{ backgroundColor: clientColor.replace(')', ' / 0.1)').replace('hsl(', 'hsl(') }}
    >
      <div className="flex items-center gap-1">
        {isArchived && <Archive className="h-2.5 sm:h-3 w-2.5 sm:w-3 text-muted-foreground" />}
        <ContentTypeIcon className="h-2.5 sm:h-3 w-2.5 sm:w-3 flex-shrink-0" />
        <span className="truncate flex-1 text-[10px] sm:text-xs">{post.title}</span>
        {/* Indicador de due date com ícone colorido */}
        {effectiveDueDate && dueDateStatus && dueDateStatus.type !== 'completed' && dueDateStatus.type !== 'on_time' && (
          <Clock className={cn(
            "h-2.5 w-2.5 flex-shrink-0",
            dueDateStatus.type === 'overdue' && "text-red-500",
            dueDateStatus.type === 'due_today' && "text-orange-500",
            dueDateStatus.type === 'due_soon' && "text-yellow-500",
          )} />
        )}
        <div className={`h-1.5 sm:h-2 w-1.5 sm:w-2 rounded-full flex-shrink-0 ${statusInfo.color}`} />
      </div>
    </div>
  );
}
```

---

## Resultado Esperado

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Dias da semana | "Dom", "Seg"... | "D", "S"... no mobile |
| Célula do dia | min-h-[120px] | min-h-[50px] no mobile |
| Posts no dia | Cards com texto | Pontos coloridos no mobile |
| Header | 1 linha bagunçada | 2 linhas organizadas |
| View mode | Texto "Mês", "Semana" | Ícones no mobile |
| Filtros | Largos, quebram | Compactos, scroll horizontal |
| Nova Postagem | "Nova Postagem" | Só ícone + no mobile |
