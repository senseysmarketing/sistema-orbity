

# Adicionar Popover de Reuniões no "+X mais" da Agenda

## Objetivo

Tornar o indicador "+X mais" clicável no calendário mensal da Agenda, exibindo um **Popover** com a lista completa de reuniões do dia, igual ao comportamento do calendário de Social Media.

---

## Comportamento Atual vs Proposto

| Atual | Proposto |
|-------|----------|
| Clique em qualquer lugar do dia → muda para visualização de dia | Clique no "+X mais" → abre popover com lista de reuniões |
| "+X mais" é texto estático | "+X mais" é botão interativo |
| Usuário precisa mudar de visualização para ver todas | Usuário vê todas sem sair da visualização mensal |

---

## Referência: SocialMediaCalendar

O componente `SocialMediaCalendar.tsx` usa:

```typescript
<Popover>
  <PopoverTrigger asChild>
    <div>...</div> {/* Célula do dia */}
  </PopoverTrigger>
  <PopoverContent className="w-72 p-0" align="start">
    <ScrollArea>
      {/* Lista de posts */}
    </ScrollArea>
  </PopoverContent>
</Popover>
```

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/agenda/MonthView.tsx` | Adicionar Popover no "+X mais" |

---

## Implementação

### 1. Adicionar Imports

```typescript
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ptBR } from "date-fns/locale";
```

### 2. Alterar a Estrutura do "+X mais"

De (texto estático):
```typescript
{hasMore && (
  <div className="text-xs text-muted-foreground px-1.5 py-0.5">
    +{remainingCount} mais
  </div>
)}
```

Para (Popover interativo):
```typescript
{hasMore && (
  <Popover>
    <PopoverTrigger asChild>
      <button 
        className="text-xs text-primary hover:underline px-1.5 py-0.5 cursor-pointer"
        onClick={(e) => e.stopPropagation()} // Evita acionar onDayClick
      >
        +{remainingCount} mais
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-72 p-0" align="start">
      <div className="p-3 border-b">
        <p className="text-sm font-medium">
          {format(day, "d 'de' MMMM", { locale: ptBR })} ({dayMeetings.length} reuniões)
        </p>
      </div>
      <ScrollArea className="max-h-60">
        <div className="p-2 space-y-1">
          {dayMeetings.map((meeting) => (
            <MeetingBlock
              key={meeting.id}
              meeting={meeting}
              onClick={() => onMeetingClick(meeting)}
              variant="month"
            />
          ))}
        </div>
      </ScrollArea>
    </PopoverContent>
  </Popover>
)}
```

---

## Detalhes Técnicos

### Stop Propagation
O `onClick={(e) => e.stopPropagation()}` no botão evita que o clique no "+X mais" acione o `onDayClick(day)` da célula pai, que mudaria para visualização de dia.

### Estilo do Botão
- Cor primária (`text-primary`) para indicar que é clicável
- Hover com underline para feedback visual
- Mesmo padding do texto original

### Conteúdo do Popover
- Header com data formatada e quantidade de reuniões
- Lista scrollável com altura máxima (max-h-60)
- Mesmo `MeetingBlock` usado na visualização, mantendo consistência

---

## Fluxo de Interação

```text
Usuário vê dia com reuniões
       │
       ├── Clique em reunião visível → abre detalhes (atual)
       │
       ├── Clique no "+X mais" → abre popover com TODAS as reuniões
       │       │
       │       └── Clique em qualquer reunião → abre detalhes
       │
       └── Clique em área vazia do dia → muda para visualização de dia (atual)
```

---

## Visual Final

```text
┌─────────────────────────┐
│ 3                       │
│ ┌─────────────────────┐ │
│ │ 10:00 Call Rápida   │ │  ← Clicável para detalhes
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 10:00 Reunião       │ │  ← Clicável para detalhes
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 14:30 Apresentação  │ │  ← Clicável para detalhes
│ └─────────────────────┘ │
│ +3 mais ← CLICÁVEL      │  ← Abre popover com todas
└─────────────────────────┘

     ┌──────────────────────────┐
     │ 3 de Fevereiro (6)       │
     ├──────────────────────────┤
     │ 10:00 Call Rápida        │
     │ 10:00 Reunião com João   │
     │ 14:30 Apresentação       │
     │ 15:00 Alinhamento        │
     │ 16:00 Workshop           │
     │ 17:30 Fechamento         │
     └──────────────────────────┘
```

