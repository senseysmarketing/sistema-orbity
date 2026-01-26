
# Plano: Filtro por Usuário no Kanban de Social Media

## Visão Geral

Adicionar um filtro por usuário atribuído no Kanban de Social Media, permitindo que a equipe visualize apenas os posts atribuídos a um membro específico (ex: Designer, Social Media, etc.).

---

## Estrutura Atual

O Kanban já possui:
- Filtro por cliente (`filterClient`)
- Filtro por tipo de conteúdo (`filterContentType`)
- Filtro por período de data (`dateRange`)
- Ordenação por data (`sortBy`)

Os posts já incluem `assigned_users` (array de usuários atribuídos) que é carregado pelo hook `useSocialMediaPosts`.

---

## Implementação

### Arquivo: `src/components/social-media/PostKanban.tsx`

**Mudanças:**

1. **Novo estado para filtro de usuário:**
```typescript
const [filterUser, setFilterUser] = useState<string>("all");
```

2. **Buscar lista de usuários únicos atribuídos aos posts:**
```typescript
const uniqueUsers = useMemo(() => {
  const usersMap = new Map();
  posts.forEach(post => {
    (post.assigned_users || []).forEach(user => {
      if (user.user_id && !usersMap.has(user.user_id)) {
        usersMap.set(user.user_id, user.name);
      }
    });
  });
  return Array.from(usersMap, ([id, name]) => ({ id, name }));
}, [posts]);
```

3. **Adicionar lógica de filtragem no `filteredPosts`:**
```typescript
if (filterUser !== "all") {
  filtered = filtered.filter(post => 
    (post.assigned_users || []).some(user => user.user_id === filterUser)
  );
}
```

4. **Adicionar Select de usuário na interface (junto aos outros filtros):**
```tsx
<Select value={filterUser} onValueChange={setFilterUser}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Todos os usuários" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos os usuários</SelectItem>
    {uniqueUsers.map(user => (
      <SelectItem key={user.id} value={user.id}>
        {user.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

5. **Atualizar `hasActiveFilters` e `clearFilters`:**
```typescript
const hasActiveFilters = filterClient !== "all" || 
  filterContentType !== "all" || 
  filterUser !== "all" ||  // <-- Adicionar
  !!dateRange?.from || 
  includeNoDate !== false || 
  sortBy !== "post_date";

const clearFilters = () => {
  setFilterClient("all");
  setFilterContentType("all");
  setFilterUser("all");  // <-- Adicionar
  setDateRange(undefined);
  setIncludeNoDate(false);
  setSortBy("post_date");
};
```

---

## Interface Visual

O filtro ficará na mesma linha dos outros filtros existentes:

```
[🔍 Filtro] [Clientes ▼] [Tipos ▼] [Usuários ▼] [Período] [Ordenar ▼] [Limpar] [+ Nova Postagem]
```

---

## Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/social-media/PostKanban.tsx` | Adicionar estado `filterUser`, memo `uniqueUsers`, lógica de filtragem e Select na UI |

---

## Resultado Esperado

- Designer pode filtrar para ver apenas seus posts atribuídos
- Social Media pode ver apenas os posts que precisa gerenciar
- Filtro funciona em conjunto com os filtros existentes (cliente, tipo, período)
- Botão "Limpar" reseta também o filtro de usuário
