

# Otimização Mobile: Central de Notificações

## Problemas Identificados (Screenshot)

| Problema | Componente | Causa |
|----------|------------|-------|
| Popover muito largo | `NotificationBell.tsx` linha 28 | Largura fixa `w-[400px]` que corta no mobile |
| Header com pouco espaço | `NotificationCenter.tsx` linha 49-92 | Título e botões em linha sem responsividade |
| Tabs com labels longos | `NotificationCenter.tsx` linha 95-99 | "Não lidas" ocupa muito espaço |
| Items de notificação grandes | `NotificationItem.tsx` linha 70-127 | Padding e fontes não otimizados para mobile |

---

## Solução

### 1. NotificationBell.tsx - Drawer no Mobile em vez de Popover

Usar Drawer (bottom sheet) no mobile para melhor UX, e manter Popover no desktop:

```tsx
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const triggerButton = (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge ...>{unreadCount > 9 ? '9+' : unreadCount}</Badge>
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="max-h-[85vh]">
          <NotificationCenter onClose={() => setOpen(false)} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <NotificationCenter onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
```

---

### 2. NotificationCenter.tsx - Header e Tabs Responsivos

**Header compacto no mobile:**
```tsx
<div className="flex items-center justify-between p-3 md:p-4 border-b">
  <h3 className="font-semibold text-base md:text-lg">Notificações</h3>
  <div className="flex gap-1 md:gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9">
          <Moon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      ...
    </DropdownMenu>
    <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9" ...>
      <CheckCheck className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9" ...>
      <Settings className="h-4 w-4" />
    </Button>
  </div>
</div>
```

**Tabs com labels abreviados no mobile:**
```tsx
<TabsList className="w-full rounded-none border-b h-10">
  <TabsTrigger value="all" className="flex-1 text-xs sm:text-sm">Todas</TabsTrigger>
  <TabsTrigger value="unread" className="flex-1 text-xs sm:text-sm">
    <span className="hidden sm:inline">Não lidas</span>
    <span className="sm:hidden">Novas</span>
  </TabsTrigger>
  <TabsTrigger value="today" className="flex-1 text-xs sm:text-sm">Hoje</TabsTrigger>
</TabsList>
```

**ScrollArea com altura adaptativa:**
```tsx
<ScrollArea className="h-[60vh] md:h-[500px]">
```
(Já está ok, apenas garantir que funcione bem com o Drawer)

---

### 3. NotificationItem.tsx - Layout Compacto no Mobile

**Padding e tipografia responsivos:**
```tsx
<div
  className={cn(
    "p-3 md:p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group",
    !notification.is_read && "bg-primary/5"
  )}
  onClick={handleClick}
>
  <div className="flex gap-2 md:gap-3">
    <div className={cn("mt-0.5 md:mt-1", colorMap[notification.type])}>
      <Icon className="h-4 w-4 md:h-5 md:w-5" />
    </div>
    
    <div className="flex-1 space-y-0.5 md:space-y-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-xs md:text-sm leading-tight line-clamp-1">
          {notification.title}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 md:h-6 md:w-6 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          onClick={handleArchive}
          type="button"
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Arquivar</span>
        </Button>
      </div>
      
      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
        {notification.message}
      </p>
      
      <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-muted-foreground">
        <span>
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
        
        {notification.action_label && (
          <>
            <span>•</span>
            <span className="flex items-center gap-1 text-primary">
              <span className="hidden sm:inline">{notification.action_label}</span>
              <span className="sm:hidden">Ver</span>
              <ExternalLink className="h-3 w-3" />
            </span>
          </>
        )}
      </div>
    </div>
    
    {!notification.is_read && (
      <div className="mt-1 md:mt-2">
        <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary" />
      </div>
    )}
  </div>
</div>
```

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/notifications/NotificationBell.tsx` | Drawer no mobile, Popover no desktop |
| `src/components/notifications/NotificationCenter.tsx` | Header compacto, tabs responsivas |
| `src/components/notifications/NotificationItem.tsx` | Padding, tipografia e ícones menores no mobile |

---

## Resultado Visual (Mobile)

### Antes vs Depois
```
ANTES (Popover cortado):        DEPOIS (Drawer full-width):
┌───────────────────┐           ┌───────────────────┐
│     [cortado]     │           │  ━━━━━━━━━━━━━━   │ <- handle do drawer
│  Notificações  ⚙️ │           │ Notificações  ⚙️✓ │
│ Todas│Não li│Hoje │           │ [Todas][Novas][Hoj│
├───────────────────┤           ├───────────────────┤
│ ✓ Post próximo... │           │ ✓ Post próximo... │
│   Caixinha de...  │           │   Caixinha...     │
│   há 1 hora · Ver │           │   1h · Ver        │
├───────────────────┤           ├───────────────────┤
│ ✓ Status atualiza │           │ ✓ Status atualiz. │
│   Arte - Valter.. │           │   Arte - Valter   │
│   há 2 horas · Ve │           │   2h · Ver tarefa │
└───────────────────┘           └───────────────────┘
```

---

## Resumo das Mudanças

| Componente | Antes | Depois |
|------------|-------|--------|
| Container | Popover 400px fixo | Drawer no mobile, Popover no desktop |
| Header padding | p-4 fixo | p-3 mobile, p-4 desktop |
| Botões de ação | h-9 w-9 | h-8 w-8 mobile, h-9 w-9 desktop |
| Tab "Não lidas" | Label completo | "Novas" no mobile |
| Item padding | p-4 fixo | p-3 mobile, p-4 desktop |
| Ícones item | h-5 w-5 | h-4 w-4 mobile, h-5 w-5 desktop |
| Botão arquivar | opacity-0 hover | Sempre visível no mobile (touch) |
| Título item | text-sm | text-xs mobile, text-sm desktop |
| Indicador não lida | h-2 w-2 | h-1.5 w-1.5 mobile |

