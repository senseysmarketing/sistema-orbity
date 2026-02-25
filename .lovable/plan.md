

# Corrigir Pesquisa de Tarefas no Gerador de Legendas

## Problemas identificados

1. **Tarefas faltando**: A query tem `.limit(50)` que pode cortar tarefas, e so exclui status `done` mas nao `completed` (status legado). Alem disso, o carregamento sequencial (1 query por tarefa para buscar cliente) e lento.

2. **Sem indicador de loading**: Nao existe estado de carregamento para as tarefas. Enquanto busca, o Combobox mostra "Nenhuma tarefa encontrada", dando impressao de que nao ha resultados.

## Solucao

### Arquivo: `src/components/social-media/CaptionGenerator.tsx`

**1. Adicionar estado `tasksLoading`**
- Novo estado `const [tasksLoading, setTasksLoading] = useState(false)`
- Setar `true` no inicio do fetch e `false` no final

**2. Otimizar a query de tarefas**
- Remover `.limit(50)` (ou aumentar para 200)
- Excluir tambem status `completed`: `.not("status", "in", "(done,completed)")`
- Substituir o loop N+1 de busca de clientes por um JOIN via `task_clients(client_id, clients(name, contact, service))` -- igual ao padrao ja usado em `useSocialMediaTasks.tsx`
- Isso elimina as N queries extras e acelera drasticamente o carregamento

**3. Mostrar loading no Combobox**
- No `CommandList`, antes do `CommandEmpty`, verificar `tasksLoading`
- Se carregando, mostrar um `Loader2` com texto "Carregando tarefas..."
- O `CommandEmpty` so aparece quando `!tasksLoading` e nao ha resultados

### Mudanca na query (antes vs depois)

**Antes:**
```
supabase.from("tasks").select("id, title, ...")
  .neq("status", "done")
  .limit(50)
// + loop de N queries para buscar cliente de cada tarefa
```

**Depois:**
```
supabase.from("tasks").select(`
  id, title, description, platform, post_type, hashtags, creative_instructions,
  task_clients(client_id, clients(name, contact, service))
`)
  .not("status", "in", "(done,completed)")
  .limit(200)
// Sem loop extra -- cliente vem no JOIN
```

### Mudanca no CommandList (loading indicator)

```tsx
<CommandList>
  {tasksLoading ? (
    <div className="flex items-center justify-center py-6 gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm text-muted-foreground">Carregando tarefas...</span>
    </div>
  ) : (
    <>
      <CommandEmpty>Nenhuma tarefa encontrada</CommandEmpty>
      {tasks.map((t) => (...))}
    </>
  )}
</CommandList>
```

## Arquivo modificado

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/social-media/CaptionGenerator.tsx` | Estado de loading, query otimizada com JOIN, indicador visual no Combobox |

