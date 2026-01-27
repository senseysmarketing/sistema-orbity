
# Otimizacao Completa para Mobile

## Contexto

Com o sistema de notificacoes push funcionando, muitos usuarios acessarao o app via dispositivos moveis. A experiencia mobile precisa ser otimizada para garantir usabilidade e produtividade nesses dispositivos.

## Diagnostico Atual

### O Que Ja Funciona
- Sidebar usa Sheet no mobile (via `useIsMobile`)
- Algumas tabs ja escondem labels no mobile (CRM, Social Media)
- Grid de metricas adapta de 1-4 colunas

### Problemas Identificados

| Componente | Problema |
|------------|----------|
| **AppLayout** | Padding fixo de `p-6` desperdiça espaco no mobile |
| **Dashboard (Index)** | Tabs com 5 colunas nao cabem no mobile, header cortado |
| **Tasks** | Kanban nao otimizado, dialogs pesados no mobile |
| **CRM** | Kanban horizontal sem indicacao visual de scroll |
| **Agenda** | Layout de 2 colunas (sidebar + calendario) quebra no mobile |
| **Social Media** | Calendario mensal muito pequeno, Kanban sem otimizacao |
| **Clients** | Cards de clientes com pouco espaco entre elementos |
| **Dialogs/Modals** | Muitos dialogs usam altura fixa que nao funciona bem no mobile |
| **Headers de pagina** | Titulos grandes demais para telas pequenas |
| **Notification Center** | ScrollArea com altura fixa de 500px |
| **Botoes de acao** | Muitos agrupamentos horizontais que quebram no mobile |

---

## Solucao

### 1. Layout Principal (`AppLayout.tsx`)

**Mudancas:**
- Reduzir padding do main de `p-6` para `p-4 md:p-6`
- Header mais compacto no mobile

```tsx
<main className="flex-1 p-4 md:p-6 overflow-hidden">
```

---

### 2. Dashboard (`Index.tsx`)

**Mudancas:**
- Tabs responsivas com scroll horizontal no mobile
- Header stack vertical no mobile
- Titulo menor no mobile

```tsx
// Tabs responsivas
<TabsList className="flex w-full overflow-x-auto scrollbar-hide">
  <TabsTrigger value="overview" className="flex-shrink-0">
    <LayoutDashboard className="h-4 w-4" />
    <span className="hidden sm:inline ml-2">Visao Geral</span>
  </TabsTrigger>
  // ... demais tabs
</TabsList>

// Header responsivo
<div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold ...">
```

---

### 3. Kanban Columns (Tasks, CRM, Social Media)

**Mudancas:**
- Largura minima reduzida no mobile (`min-w-[280px] md:min-w-[330px]`)
- Altura maxima ajustada (`max-h-[60vh] md:max-h-[70vh]`)
- Indicador visual de scroll horizontal

**Arquivos:**
- `src/components/ui/kanban-column.tsx`
- `src/components/crm/LeadKanbanColumn.tsx`
- `src/components/social-media/PostKanbanColumn.tsx`

```tsx
<div className="space-y-4 min-w-[280px] md:min-w-[330px] w-[280px] md:w-[330px] flex-shrink-0">
```

---

### 4. Agenda (`Agenda.tsx`)

**Mudancas:**
- Grid de 2 colunas apenas em `lg`, coluna unica no mobile/tablet
- Mini calendario e filtros colapsaveis no mobile
- MonthView com altura minima reduzida

```tsx
<div className="grid lg:grid-cols-[280px_1fr] gap-4 lg:gap-6">
  {/* Sidebar - oculto no mobile, visivel com toggle */}
  <div className="hidden lg:block space-y-4">
```

**Componente novo: MobileSidebarToggle**
- Botao flutuante para abrir filtros/mini calendario no mobile
- Usa Sheet para exibir sidebar como drawer

---

### 5. MonthView (`MonthView.tsx`)

**Mudancas:**
- Celulas com altura minima menor no mobile (`min-h-[80px] md:min-h-[120px]`)
- Nomes dos dias abreviados mais curtos no mobile ("D", "S", etc)
- Meetings mostram apenas indicador colorido no mobile

```tsx
const weekDaysMobile = ["D", "S", "T", "Q", "Q", "S", "S"];
const weekDaysDesktop = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
```

---

### 6. CalendarHeader (`CalendarHeader.tsx`)

**Mudancas:**
- Botoes de view mode como icones no mobile
- Botao "Nova Reuniao" com apenas icone no mobile

```tsx
<Button variant="action" onClick={onNewMeeting} className="flex-shrink-0">
  <Plus className="h-4 w-4" />
  <span className="hidden sm:inline ml-2">Nova Reuniao</span>
</Button>
```

---

### 7. Dialogs e Modals

**Arquivos afetados:**
- `TaskDetailsDialog.tsx`
- `MeetingFormDialog.tsx`
- `MeetingDetailsDialog.tsx`
- `LeadDetailsDialog.tsx`
- `PostDetailsDialog.tsx`

**Mudancas:**
- DialogContent com altura maxima responsiva: `max-h-[85vh] md:max-h-[90vh]`
- Botoes de footer em stack vertical no mobile
- Padding interno reduzido no mobile

```tsx
<DialogContent className="max-w-2xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto p-4 md:p-6">
  ...
  <DialogFooter className="flex-col sm:flex-row gap-2">
```

---

### 8. Notification Center (`NotificationCenter.tsx`)

**Mudancas:**
- ScrollArea com altura dinamica baseada em viewport
- Header mais compacto

```tsx
<ScrollArea className="h-[60vh] md:h-[500px]">
```

---

### 9. Headers de Pagina (Todas as paginas)

**Padrao a aplicar:**
- Titulo `text-2xl md:text-3xl`
- Descricao `text-sm md:text-base`
- Flex column no mobile, row no desktop

**Arquivos:**
- `Index.tsx`
- `Tasks.tsx`
- `CRM.tsx`
- `SocialMedia.tsx`
- `Agenda.tsx`
- `Clients.tsx`
- `Settings.tsx`

```tsx
<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
  <div>
    <h1 className="text-2xl md:text-3xl font-bold">...</h1>
    <p className="text-sm md:text-base text-muted-foreground">...</p>
  </div>
  <div className="flex gap-2 mt-2 md:mt-0">
    {/* action buttons */}
  </div>
</div>
```

---

### 10. Quick Actions (`QuickActions.tsx`)

**Mudancas:**
- Grid de 2 colunas no mobile (em vez de 3)
- Botoes mais compactos

```tsx
<div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
```

---

### 11. Cards de Tarefas e Leads

**Arquivos:**
- `src/components/ui/task-card.tsx`
- `src/components/crm/SortableLeadCard.tsx`

**Mudancas:**
- Padding reduzido no mobile (`p-3 md:p-4`)
- Font sizes adaptativas
- Badges menores no mobile

---

### 12. Bottom Navigation Mobile (Novo Componente)

**Componente: `MobileBottomNav.tsx`**

Navegacao fixa na parte inferior da tela para mobile, facilitando acesso rapido as areas principais.

```tsx
const mobileNavItems = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: CheckSquare, label: "Tarefas", path: "/dashboard/tasks" },
  { icon: Target, label: "CRM", path: "/dashboard/crm" },
  { icon: Calendar, label: "Agenda", path: "/dashboard/agenda" },
  { icon: Menu, label: "Mais", path: null }, // abre sidebar
];
```

**Exibicao:**
- Visivel apenas no mobile (`md:hidden`)
- Adiciona padding inferior no main content para nao cobrir conteudo

---

### 13. Safe Area e PWA Adjustments

**Arquivo: `index.css`**

```css
/* PWA safe areas */
.pwa-safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.pwa-safe-top {
  padding-top: env(safe-area-inset-top, 0);
}

/* Mobile bottom nav spacing */
.has-mobile-nav {
  padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0));
}
```

---

### 14. Touch Improvements

**Global CSS:**
- Aumentar hit areas de botoes para 44x44px minimo
- Touch feedback visual

```css
@media (pointer: coarse) {
  button, [role="button"] {
    min-height: 44px;
    min-width: 44px;
  }
}
```

---

## Resumo de Arquivos a Modificar

| Arquivo | Tipo de Mudanca |
|---------|-----------------|
| `src/components/layout/AppLayout.tsx` | Padding responsivo, bottom nav |
| `src/pages/Index.tsx` | Tabs, header, grid responsivos |
| `src/pages/Tasks.tsx` | Header, filtros responsivos |
| `src/pages/CRM.tsx` | Header, tabs responsivos |
| `src/pages/Agenda.tsx` | Layout 1 coluna mobile, sidebar toggle |
| `src/pages/SocialMedia.tsx` | Tabs responsivas |
| `src/pages/Clients.tsx` | Header, grid responsivo |
| `src/components/ui/kanban-column.tsx` | Largura/altura responsiva |
| `src/components/crm/LeadKanbanColumn.tsx` | Largura/altura responsiva |
| `src/components/social-media/PostKanbanColumn.tsx` | Largura/altura responsiva |
| `src/components/agenda/CalendarHeader.tsx` | Botoes compactos mobile |
| `src/components/agenda/MonthView.tsx` | Celulas menores mobile |
| `src/components/tasks/TaskDetailsDialog.tsx` | Dialog responsivo |
| `src/components/notifications/NotificationCenter.tsx` | ScrollArea responsiva |
| `src/components/dashboard/QuickActions.tsx` | Grid 2 colunas mobile |
| `src/components/ui/task-card.tsx` | Padding/fonts responsivos |
| `src/components/layout/MobileBottomNav.tsx` | **NOVO** |
| `src/index.css` | Safe areas, touch improvements |

---

## Ordem de Implementacao

1. **Layout base** - AppLayout, index.css (safe areas)
2. **Bottom Navigation** - MobileBottomNav
3. **Headers de pagina** - Todas as paginas principais
4. **Kanban columns** - Tasks, CRM, Social Media
5. **Agenda** - Layout responsivo e MonthView
6. **Dialogs** - Responsividade de modais
7. **Cards** - Task cards, Lead cards
8. **Componentes menores** - QuickActions, NotificationCenter

---

## Resultado Esperado

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Navegacao | Sidebar lateral apenas | Sidebar + Bottom nav mobile |
| Espaco em tela | Padding fixo grande | Padding responsivo |
| Kanban | Colunas fixas 330px | Colunas 280px mobile |
| Dialogs | Altura fixa | Altura adaptativa |
| Headers | Tamanho fixo | Responsivos |
| Touch | Areas pequenas | Min 44px |
| PWA | Sem safe areas | Com safe areas |

