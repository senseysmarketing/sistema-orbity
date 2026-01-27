

# Otimizacao Mobile: Tela de CRM

## Problemas Identificados (Screenshot)

| Problema | Componente | Causa |
|----------|------------|-------|
| Botoes de periodo quebrados | `CRMDashboard.tsx` linha 179-211 | Botoes "Este Mes", "Mes Passado" etc em `flex-wrap` que empilha mal |
| Cards de metricas muito largos | `CRMDashboard.tsx` linha 215 | Grid `md:grid-cols-4` nao tem coluna mobile definida |
| Funil labels cortados na base | `CRMFunnelChart.tsx` linha 188 | Grid `grid-cols-6` sem responsividade, textos truncados |
| Header do funil em linha unica | `CRMFunnelChart.tsx` linha 127-132 | `flex justify-between` que quebra no mobile |
| Tabs de config sem scroll | `CRMSettings.tsx` linha 18 | `TabsList grid-cols-4` empilha textos |
| Filtros do Pipeline muito largos | `CRM.tsx` linhas 406-456 | Selects `w-full md:w-[180px]` ocupam toda largura |

---

## Solucao

### 1. CRMDashboard.tsx - Periodo Selector Responsivo

**Problema atual (linhas 179-211):**
```tsx
<div className="flex flex-wrap items-center gap-2">
  <span className="text-sm text-muted-foreground">Periodo:</span>
  {quickPeriods.map((period) => (
    <Button ...>{period.label}</Button>
  ))}
  <Popover>...</Popover>
</div>
```

**Solucao:** Scroll horizontal no mobile:

```tsx
<div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
  <span className="text-sm text-muted-foreground whitespace-nowrap flex-shrink-0">Periodo:</span>
  {quickPeriods.map((period) => (
    <Button
      key={period.label}
      variant={dateRange.from.getTime() === period.from.getTime() ? "default" : "outline"}
      size="sm"
      onClick={() => setDateRange({ from: period.from, to: period.to })}
      className="flex-shrink-0 whitespace-nowrap"
    >
      {period.label}
    </Button>
  ))}
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" size="sm" className="flex-shrink-0 whitespace-nowrap">
        <CalendarIcon className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline">
          {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
        </span>
        <span className="sm:hidden">
          {format(dateRange.from, "dd/MM", { locale: ptBR })} - {format(dateRange.to, "dd/MM", { locale: ptBR })}
        </span>
      </Button>
    </PopoverTrigger>
    ...
  </Popover>
</div>
```

---

### 2. CRMDashboard.tsx - Cards de Metricas Responsivos

**Problema atual (linha 215):**
```tsx
<div className="grid gap-4 md:grid-cols-4">
```

**Solucao:** 2 colunas no mobile:
```tsx
<div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
```

---

### 3. CRMFunnelChart.tsx - Header Responsivo

**Problema atual (linhas 127-132):**
```tsx
<div className="flex items-center justify-between">
  <CardTitle className="text-lg font-semibold">Funil de Vendas</CardTitle>
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <span>Taxa de Conversao Geral:</span>
    <span className="font-semibold text-primary">{generalConversionRate}%</span>
  </div>
</div>
```

**Solucao:** Stack vertical no mobile:
```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
  <CardTitle className="text-base sm:text-lg font-semibold">Funil de Vendas</CardTitle>
  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
    <span>Taxa de Conversao Geral:</span>
    <span className="font-semibold text-primary">{generalConversionRate}%</span>
  </div>
</div>
```

---

### 4. CRMFunnelChart.tsx - Grid de Conversoes Responsivo

**Problema atual (linhas 188-205):**
```tsx
<div className="grid grid-cols-6 gap-2 mt-6 pt-4 border-t">
  {funnelData.slice(1).map((stage, index) => (
    <div key={stage.name} className="text-center">
      <div className="text-xs text-muted-foreground mb-1 truncate">
        {previousStage.name} → {stage.name}
      </div>
      <div className="text-base font-bold" style={{ color: stage.fill }}>
        {rate}%
      </div>
    </div>
  ))}
</div>
```

**Solucao:** Scroll horizontal no mobile com labels abreviados:
```tsx
<div className="flex gap-2 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t overflow-x-auto scrollbar-hide pb-1">
  {funnelData.slice(1).map((stage, index) => {
    const previousStage = funnelData[index];
    const rate = previousStage.value > 0 
      ? ((stage.value / previousStage.value) * 100).toFixed(1) 
      : "0";
    // Abreviar nomes longos no mobile
    const getShortName = (name: string) => {
      const abbr: Record<string, string> = {
        "Em contato": "Cont.",
        "Qualificados": "Qual.",
        "Agendamentos": "Agen.",
        "Reunioes": "Reun.",
        "Propostas": "Prop.",
        "Vendas": "Vend.",
      };
      return abbr[name] || name;
    };
    return (
      <div key={stage.name} className="text-center flex-shrink-0 min-w-[60px] sm:min-w-[80px]">
        <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">
          <span className="hidden sm:inline">{previousStage.name} → {stage.name}</span>
          <span className="sm:hidden">{getShortName(previousStage.name)} → {getShortName(stage.name)}</span>
        </div>
        <div className="text-sm sm:text-base font-bold" style={{ color: stage.fill }}>
          {rate}%
        </div>
      </div>
    );
  })}
</div>
```

---

### 5. CRMSettings.tsx - Tabs com Scroll Horizontal

**Problema atual (linhas 17-23):**
```tsx
<Tabs defaultValue="integration" className="space-y-4">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="integration">Integracao</TabsTrigger>
    <TabsTrigger value="investments">Investimentos</TabsTrigger>
    <TabsTrigger value="status">Status</TabsTrigger>
    <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
  </TabsList>
```

**Solucao:** Scroll horizontal com icones:
```tsx
import { Link2, DollarSign, Layers, Webhook } from "lucide-react";

<div>
  <h2 className="text-xl md:text-2xl font-bold">Configuracoes do CRM</h2>
  <p className="text-sm text-muted-foreground">
    Personalize seu pipeline de vendas e integracoes
  </p>
</div>

<Tabs defaultValue="integration" className="space-y-4">
  <TabsList className="flex w-full overflow-x-auto scrollbar-hide">
    <TabsTrigger value="integration" className="flex-shrink-0 gap-1 md:gap-2">
      <Link2 className="h-4 w-4" />
      <span className="hidden sm:inline">Integracao</span>
    </TabsTrigger>
    <TabsTrigger value="investments" className="flex-shrink-0 gap-1 md:gap-2">
      <DollarSign className="h-4 w-4" />
      <span className="hidden sm:inline">Investimentos</span>
    </TabsTrigger>
    <TabsTrigger value="status" className="flex-shrink-0 gap-1 md:gap-2">
      <Layers className="h-4 w-4" />
      <span className="hidden sm:inline">Status</span>
    </TabsTrigger>
    <TabsTrigger value="webhooks" className="flex-shrink-0 gap-1 md:gap-2">
      <Webhook className="h-4 w-4" />
      <span className="hidden sm:inline">Webhooks</span>
    </TabsTrigger>
  </TabsList>
</Tabs>
```

---

### 6. CRM.tsx - Filtros do Pipeline Responsivos

**Problema atual (linhas 406-456):**
```tsx
<div className="flex flex-col md:flex-row gap-4">
  <div className="relative flex-1">
    <Input ... />
  </div>
  <Select ...><SelectTrigger className="w-full md:w-[180px]">...</SelectTrigger></Select>
  ...
</div>
```

**Solucao:** Busca isolada + filtros em scroll horizontal:
```tsx
import { Filter } from "lucide-react";

<div className="space-y-3">
  {/* Linha 1: Busca */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
    <Input
      placeholder="Buscar leads..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="pl-9"
    />
  </div>
  
  {/* Linha 2: Filtros com scroll horizontal */}
  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
    <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-[130px] sm:w-[160px] h-9 text-xs sm:text-sm flex-shrink-0">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      ...
    </Select>
    
    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
      <SelectTrigger className="w-[110px] sm:w-[140px] h-9 text-xs sm:text-sm flex-shrink-0">
        <SelectValue placeholder="Temp." />
      </SelectTrigger>
      ...
    </Select>
    
    <Select value={sourceFilter} onValueChange={setSourceFilter}>
      <SelectTrigger className="w-[110px] sm:w-[140px] h-9 text-xs sm:text-sm flex-shrink-0">
        <SelectValue placeholder="Origem" />
      </SelectTrigger>
      ...
    </Select>
  </div>
</div>
```

---

### 7. CRMInvestmentMetrics.tsx - Grid Responsivo (ja OK, confirmar)

O grid `md:grid-cols-2` ja funciona bem no mobile (1 coluna), apenas confirmar espacamentos.

---

## Arquivos a Modificar

| Arquivo | Mudancas |
|---------|----------|
| `src/components/crm/CRMDashboard.tsx` | Periodo selector com scroll, cards 2 colunas mobile |
| `src/components/crm/CRMFunnelChart.tsx` | Header responsivo, grid de conversoes com scroll |
| `src/components/crm/CRMSettings.tsx` | Tabs com scroll horizontal e icones |
| `src/pages/CRM.tsx` | Filtros do pipeline em scroll horizontal |

---

## Resultado Visual (Mobile)

### Periodo Selector (Antes vs Depois)
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌───────────────────┐
│ Periodo:          │           │ Per:[Este][Ult]→  │
│ [Este Mes]        │           │  (scroll horiz)   │
│ [Mes Passado]     │           └───────────────────┘
│ [Ultimos 3 Meses] │           
│ [📅 01/01 - 31/01]│           
└───────────────────┘           
```

### Cards Metricas (Antes vs Depois)
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌─────────┬─────────┐
│ Total de Leads    │           │ Leads   │ Conv.   │
│ 101               │           │ 101     │ 5.0%    │
├───────────────────┤           ├─────────┼─────────┤
│ Taxa Conversao    │           │ Receita │ Atencao │
│ 5.0%              │           │ R$8.560 │ 5       │
├───────────────────┤           └─────────┴─────────┘
│ Receita Confirm.  │           
│ R$ 8.560          │           
├───────────────────┤           
│ Atencao Necess.   │           
│ 5                 │           
└───────────────────┘           
```

### Funil Conversoes (Antes vs Depois)
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌───────────────────┐
│ Lead... Em c... Qu│           │ [Lead→Cont][Cont→Q│
│ 20.8%  61.9% 92.3%│           │  20.8%    61.9% → │
│      (cortado)    │           │  (scroll horiz)   │
└───────────────────┘           └───────────────────┘
```

### Tabs Config (Antes vs Depois)
```
ANTES:                          DEPOIS:
┌───────────────────┐           ┌───────────────────┐
│ Integr│Invest│Sta.│           │ [🔗][💲][≡][🔌]  │
│ Webho │      │    │           │  (icones apenas)  │
└───────────────────┘           └───────────────────┘
```

---

## Resumo das Mudancas

| Componente | Antes | Depois |
|------------|-------|--------|
| Periodo selector | flex-wrap vertical | scroll horizontal |
| Cards metricas | 1 coluna mobile | 2 colunas mobile |
| Funil header | 1 linha que quebra | stack vertical mobile |
| Funil conversoes | grid-cols-6 truncado | scroll horizontal + abbr |
| Settings tabs | grid-cols-4 empilhado | scroll horizontal + icones |
| Pipeline filtros | flex-col vertical | busca + scroll horizontal |

