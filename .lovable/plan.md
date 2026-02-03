

# Filtro de Usuários: Mostrar Apenas Quem Tem Reuniões

## Objetivo

Alterar o filtro de "Responsável" para mostrar **apenas usuários que participam ou organizam reuniões**, eliminando a query separada de `agency_users` e derivando a lista diretamente das reuniões existentes.

---

## Benefícios

| Antes | Depois |
|-------|--------|
| Busca todos os usuários da agência | Deriva lista das próprias reuniões |
| Usuários inativos aparecem | Apenas quem tem reuniões aparece |
| Query extra no banco | Sem query adicional (usa dados já carregados) |
| Filtro poluído | Filtro limpo e relevante |

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Agenda.tsx` | Derivar usuários das reuniões em vez de buscar da tabela |

---

## Implementação

### Remover Query de agency_users

A query atual (linhas 24-41) que busca todos os usuários será **removida**.

### Derivar Usuários das Reuniões

Criar um `useMemo` que extrai usuários únicos das reuniões:

```typescript
// Derivar usuários que aparecem nas reuniões (organizador ou participante)
const usersWithMeetings = useMemo(() => {
  const userMap = new Map<string, { id: string; name: string }>();
  
  for (const meeting of meetings) {
    // Adicionar organizador
    if (meeting.organizer_id && meeting.organizer) {
      userMap.set(meeting.organizer_id, {
        id: meeting.organizer_id,
        name: meeting.organizer.name || "Usuário"
      });
    }
    
    // Adicionar participantes (precisamos buscar os nomes)
    // Por enquanto, usar ID como fallback
    for (const participantId of (meeting.participants || [])) {
      if (!userMap.has(participantId)) {
        userMap.set(participantId, {
          id: participantId,
          name: participantId // Será melhorado abaixo
        });
      }
    }
  }
  
  return Array.from(userMap.values());
}, [meetings]);
```

### Buscar Nomes dos Participantes

Como os nomes dos participantes não vêm no hook `useMeetings`, faremos uma query apenas para os IDs encontrados:

```typescript
// Buscar nomes apenas dos usuários que têm reuniões
const participantIds = useMemo(() => {
  const ids = new Set<string>();
  for (const meeting of meetings) {
    for (const pId of (meeting.participants || [])) {
      ids.add(pId);
    }
  }
  return Array.from(ids);
}, [meetings]);

const { data: participantProfiles = [] } = useQuery({
  queryKey: ["participant-profiles", participantIds],
  queryFn: async () => {
    if (participantIds.length === 0) return [];
    const { data } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", participantIds);
    return data || [];
  },
  enabled: participantIds.length > 0,
});

// Montar lista final de usuários com nomes
const agencyUsers = useMemo(() => {
  const userMap = new Map<string, AgencyUser>();
  
  // Adicionar organizadores (já têm nome via join no hook)
  for (const meeting of meetings) {
    if (meeting.organizer_id && meeting.organizer?.name) {
      userMap.set(meeting.organizer_id, {
        id: meeting.organizer_id,
        name: meeting.organizer.name
      });
    }
  }
  
  // Adicionar participantes com nomes da query
  for (const profile of participantProfiles) {
    if (!userMap.has(profile.id)) {
      userMap.set(profile.id, {
        id: profile.id,
        name: profile.name || "Usuário"
      });
    }
  }
  
  // Ordenar por nome
  return Array.from(userMap.values())
    .sort((a, b) => a.name.localeCompare(b.name));
}, [meetings, participantProfiles]);
```

---

## Fluxo de Dados

```text
Reuniões carregadas
       │
       ▼
Extrair IDs únicos (organizador + participantes)
       │
       ├── Organizadores → nome já vem no join
       │
       └── Participantes → buscar nomes via query
       │
       ▼
Montar lista de usuários para o filtro
       │
       ▼
Mostrar apenas quem tem reuniões
```

---

## Resultado Visual

Antes (todos da agência):
```text
☑ Ana Silva
☑ Bruno Costa
☑ Carlos Lima      ← Nunca teve reunião
☑ Diana Martins    ← Nunca teve reunião
☑ Eduardo Santos
```

Depois (apenas com reuniões):
```text
☑ Ana Silva
☑ Bruno Costa
☑ Eduardo Santos
```

---

## Comportamento do Filtro

- **Se não houver reuniões**: Seção de filtro por usuário não aparece
- **Usuário novo cria reunião**: Aparece automaticamente no filtro
- **Reunião excluída**: Se era a única do usuário, ele sai do filtro

