

# Adicionar Filtro por Usuário na Agenda

## Objetivo

Adicionar um filtro por usuário na sidebar de filtros da Agenda, posicionado **antes** dos filtros de Tipo e Status. O filtro mostrará reuniões onde o usuário selecionado é **organizador** ou **participante**.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/agenda/CalendarFilters.tsx` | Adicionar seção de filtro por usuário |
| `src/pages/Agenda.tsx` | Adicionar state e lógica de filtragem por usuário |

---

## Implementação

### 1. Atualizar CalendarFilters.tsx

Adicionar nova prop e seção de filtro:

```typescript
// Nova interface de usuário para filtro
interface AgencyUser {
  id: string;
  name: string;
}

interface CalendarFiltersProps {
  // Novo filtro de usuário
  users: AgencyUser[];
  userFilters: string[];
  onUserFilterChange: (userIds: string[]) => void;
  // Existentes
  typeFilters: MeetingTypeFilter[];
  statusFilters: MeetingStatusFilter[];
  onTypeFilterChange: (types: MeetingTypeFilter[]) => void;
  onStatusFilterChange: (statuses: MeetingStatusFilter[]) => void;
}
```

Nova seção no componente (antes de Tipo):

```typescript
{/* Filtro de Usuário - PRIMEIRO */}
<div className="space-y-2">
  <p className="text-xs font-medium text-muted-foreground uppercase">
    Responsável
  </p>
  {users.map((user) => (
    <div key={user.id} className="flex items-center gap-2">
      <Checkbox
        id={`user-${user.id}`}
        checked={userFilters.includes(user.id)}
        onCheckedChange={() => toggleUserFilter(user.id)}
      />
      <User className="h-3 w-3 text-muted-foreground" />
      <Label htmlFor={`user-${user.id}`} className="text-sm cursor-pointer">
        {user.name}
      </Label>
    </div>
  ))}
</div>

<div className="border-t pt-4" /> {/* Separador antes de Tipo */}
```

---

### 2. Atualizar Agenda.tsx

Adicionar query para buscar usuários e lógica de filtragem:

```typescript
// Nova query para buscar usuários da agência
const { data: agencyUsers = [] } = useQuery({
  queryKey: ["agency-users", currentAgency?.id],
  queryFn: async () => {
    if (!currentAgency?.id) return [];
    const { data } = await supabase
      .from("agency_users")
      .select(`
        user_id,
        profiles:profiles!agency_users_user_id_fkey(name)
      `)
      .eq("agency_id", currentAgency.id);
    return (data || []).map(item => ({
      id: item.user_id,
      name: (item.profiles as any)?.name || "Usuário",
    }));
  },
  enabled: !!currentAgency?.id,
});

// Novo state para filtro de usuário (todos selecionados por padrão)
const [userFilters, setUserFilters] = useState<string[]>([]);

// Inicializar filtro com todos os usuários quando carregarem
useEffect(() => {
  if (agencyUsers.length > 0 && userFilters.length === 0) {
    setUserFilters(agencyUsers.map(u => u.id));
  }
}, [agencyUsers]);

// Atualizar lógica de filtragem
const filteredMeetings = useMemo(() => {
  return meetings.filter((meeting) => {
    const typeMatch = typeFilters.includes(meeting.meeting_type);
    const statusMatch = statusFilters.includes(meeting.status);
    
    // Filtro por usuário: organizador OU participante
    const userMatch = userFilters.length === 0 || 
      userFilters.includes(meeting.organizer_id) ||
      (meeting.participants || []).some(p => userFilters.includes(p));
    
    return typeMatch && statusMatch && userMatch;
  });
}, [meetings, typeFilters, statusFilters, userFilters]);
```

---

## Lógica de Filtragem

A reunião aparece se o usuário selecionado é:
- **Organizador** (`organizer_id`)
- **Participante** (está no array `participants`)

| Cenário | Resultado |
|---------|-----------|
| Usuário é organizador | ✅ Aparece |
| Usuário é participante | ✅ Aparece |
| Usuário não está relacionado | ❌ Oculta |
| Nenhum filtro selecionado | ✅ Mostra todas |

---

## Layout Final dos Filtros

```text
┌─────────────────────────┐
│ Filtros                 │
├─────────────────────────┤
│ RESPONSÁVEL             │  ← NOVO (primeiro)
│ ☑ Ana Silva             │
│ ☑ Bruno Costa           │
│ ☑ Carlos Lima           │
├─────────────────────────┤
│ TIPO                    │
│ ☑ 🟢 Comercial          │
│ ☑ 🔵 Cliente            │
│ ...                     │
├─────────────────────────┤
│ STATUS                  │
│ ☑ Agendada              │
│ ☑ Concluída             │
│ ...                     │
└─────────────────────────┘
```

---

## Comportamento Padrão

- **Ao carregar**: Todos os usuários selecionados (mostra todas as reuniões)
- **Desmarcar usuário**: Oculta reuniões onde ele é organizador/participante
- **Nenhum selecionado**: Mostra todas (fallback para não esconder tudo)

