

# Otimização Mobile: Modal de Preferências de Notificação

## Problemas Identificados

| Problema | Local | Causa |
|----------|-------|-------|
| Dialog muito largo no mobile | Linha 528 | `max-w-2xl` sem adaptação mobile |
| Cards com padding excessivo | Linhas 538-939 | `CardHeader` e `CardContent` padrão |
| Labels longos cortando | Várias linhas | Textos sem quebra responsiva |
| Footer não fixo | Linhas 942-949 | Botões podem ficar fora da view |
| Tipografia grande demais | Todo o componente | `text-lg` fixo nos títulos |

---

## Solução

### 1. Wrapper Responsivo: Drawer no Mobile, Dialog no Desktop

Criar lógica condicional que renderiza `Drawer` (bottom sheet) no mobile e mantém `Dialog` no desktop, similar ao que fizemos no `NotificationBell`.

```tsx
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";

export function NotificationPreferences({ open, onOpenChange }: NotificationPreferencesProps) {
  const isMobile = useIsMobile();
  // ... existing state and logic ...

  const content = (
    // Content component extracted
  );

  const footer = (
    <div className="flex justify-end gap-3 pt-4 border-t">
      <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
        Cancelar
      </Button>
      <Button onClick={handleSave} disabled={loading}>
        {loading ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Preferências de Notificação</DrawerTitle>
            <DrawerDescription>
              Configure como e quando você deseja receber notificações
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-4">
            {content}
          </div>
          <DrawerFooter className="border-t pt-4">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferências de Notificação</DialogTitle>
          <DialogDescription>...</DialogDescription>
        </DialogHeader>
        {content}
        {footer}
      </DialogContent>
    </Dialog>
  );
}
```

---

### 2. Cards Responsivos

Ajustar os Cards para terem padding menor no mobile:

```tsx
<Card>
  <CardHeader className="p-4 md:p-6">
    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
      <Bell className="h-4 w-4 md:h-5 md:w-5" />
      O que notificar
    </CardTitle>
    <CardDescription className="text-xs md:text-sm">
      Escolha os tipos de notificações que deseja receber
    </CardDescription>
  </CardHeader>
  <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-3 md:space-y-4">
    ...
  </CardContent>
</Card>
```

---

### 3. Labels Responsivos

Para labels longos como "Quando houver mudanças importantes (prazo/prioridade/título)", usar texto mais curto no mobile:

```tsx
<div className="flex items-center justify-between">
  <Label className="cursor-pointer text-sm md:text-base">
    <span className="hidden md:inline">Quando houver mudanças importantes (prazo/prioridade/título)</span>
    <span className="md:hidden">Mudanças importantes</span>
  </Label>
  <Switch ... />
</div>
```

---

### 4. Switches com Descrições Compactas

Para itens com descrição adicional, manter apenas o label principal no mobile:

```tsx
<div className="flex items-center justify-between">
  <div className="flex-1 min-w-0 mr-3">
    <Label className="cursor-pointer text-sm">Notificar admins quando tarefa virar Concluída</Label>
    <p className="text-xs text-muted-foreground hidden sm:block">Evento: mudança de status → done</p>
  </div>
  <Switch ... className="flex-shrink-0" />
</div>
```

---

### 5. Footer com Botão Responsivo

Texto do botão mais curto no mobile:

```tsx
<div className="flex justify-end gap-2 md:gap-3">
  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} size="sm" className="md:size-default">
    Cancelar
  </Button>
  <Button onClick={handleSave} disabled={loading} size="sm" className="md:size-default">
    {loading ? "Salvando..." : (
      <>
        <span className="hidden md:inline">Salvar Preferências</span>
        <span className="md:hidden">Salvar</span>
      </>
    )}
  </Button>
</div>
```

---

## Arquivo a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/components/notifications/NotificationPreferences.tsx` | Drawer no mobile, Dialog no desktop, cards/labels/footer responsivos |

---

## Resultado Visual (Mobile)

### Antes vs Depois
```
ANTES (Dialog cortado):         DEPOIS (Drawer full-width):
┌───────────────────┐           ┌───────────────────┐
│    [cortado]      │           │  ━━━━━━━━━━━━━━   │ <- handle
│ Preferências de   │           │ Preferências de   │
│ Notificação       │           │ Notificação       │
│                   │           │ Configure como... │
│ ┌───────────────┐ │           ├───────────────────┤
│ │ O que notif.  │ │           │ O que notificar   │
│ │ 📝 Lembretes  │ │           │ 📝 Lembretes    ⚪│
│ │ ✅ Tarefas    │ │           │ ✅ Tarefas      ⚪│
│ │ 📱 Posts...   │ │           │ 📱 Posts        ⚪│
│ └───────────────┘ │           │ (scroll interno)  │
│                   │           ├───────────────────┤
│ [Cancelar][Salvar]│           │ [Cancelar][Salvar]│
└───────────────────┘           └───────────────────┘
```

---

## Resumo das Mudanças

| Componente | Antes | Depois |
|------------|-------|--------|
| Container | Dialog max-w-2xl | Drawer no mobile, Dialog no desktop |
| Card padding | p-6 fixo | p-4 mobile, p-6 desktop |
| Card titles | text-lg | text-base mobile, text-lg desktop |
| Icons | h-5 w-5 | h-4 w-4 mobile, h-5 w-5 desktop |
| Labels longos | Texto completo | Versão curta no mobile |
| Descrições extras | Sempre visíveis | Ocultas no mobile (sm:block) |
| Botão salvar | "Salvar Preferências" | "Salvar" no mobile |
| Footer | Inline no scroll | Fixo no bottom do Drawer |

