

# Filtros Multiplos na Tela de Tarefas

## Resumo

Converter os filtros de tarefas de selecao unica para selecao multipla, permitindo filtrar por varios clientes, usuarios, tipos, prioridades e status ao mesmo tempo.

## O que muda para o usuario

- Cada filtro (Usuario, Cliente, Tipo, Prioridade) passa a aceitar multiplas selecoes simultaneas
- O botao do filtro mostra quantos itens estao selecionados (ex: "3 clientes", "2 usuarios")
- Clicar em um item ja selecionado desmarca-o
- Opcoes especiais como "Sem Cliente" e "Nao atribuido" continuam funcionando junto com as demais selecoes
- O filtro de Status permanece como esta (ja controlado pelo Kanban visualmente)
- Botao de limpar filtros continua funcionando

## Detalhes Tecnicos

### Arquivo: `src/pages/Tasks.tsx`

**1. Converter estados de filtro de `string` para `string[]`**

Antes:
```ts
const [priorityFilter, setPriorityFilter] = useState<string>("all");
const [assignedFilter, setAssignedFilter] = useState<string>("all");
const [clientFilter, setClientFilter] = useState<string>("all");
const [typeFilter, setTypeFilter] = useState<string>("all");
```

Depois:
```ts
const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
const [assignedFilter, setAssignedFilter] = useState<string[]>([]);
const [clientFilter, setClientFilter] = useState<string[]>([]);
const [typeFilter, setTypeFilter] = useState<string[]>([]);
```

Array vazio = "todos" (sem filtro ativo).

**2. Atualizar logica de filtragem no `filteredTasks` useMemo**

- `matchesPriority`: `priorityFilter.length === 0 || priorityFilter.includes(task.priority)`
- `matchesType`: `typeFilter.length === 0 || typeFilter.includes(task.task_type)`
- `matchesAssigned`: se array vazio = todos; se inclui "unassigned" verifica sem atribuicao; demais verifica se algum dos usuarios atribuidos esta no filtro
- `matchesClient`: se array vazio = todos; se inclui "no-client" aceita tasks sem cliente; demais verifica se `task.client_id` esta no array

**3. Converter UI dos filtros para multi-select com Popover + Command (checkboxes)**

Cada filtro sera um Popover com CommandList onde cada item tem um Checkbox. Padrao similar ao filtro de cliente existente, mas com toggle em vez de selecao unica.

- **Filtro de Usuario**: Popover com lista de usuarios + opcao "Nao atribuido". Label do botao: "Todos Usuarios" quando vazio, "X usuarios" quando selecionados.
- **Filtro de Cliente**: Manter o Combobox com busca, mas com toggle multi-select. Label: "Todos Clientes" / "X clientes".
- **Filtro de Prioridade**: Popover com Alta/Media/Baixa como checkboxes. Label: "Prioridade" / "X prioridades".
- **Filtro de Tipo**: Popover com tipos dinamicos como checkboxes. Label: "Todos os Tipos" / "X tipos".

**4. Atualizar `clearFilters`**

```ts
const clearFilters = () => {
  setSearchTerm("");
  setStatusFilter("all");
  setPriorityFilter([]);
  setAssignedFilter([]);
  setClientFilter([]);
  setTypeFilter([]);
  setDueDateRange(undefined);
  setIncludeNoDueDate(false);
};
```

**5. Atualizar condicao de exibicao do botao limpar filtros**

Trocar `!== "all"` por `.length > 0` para os filtros convertidos.

### Arquivo modificado

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Tasks.tsx` | Converter 4 filtros para multi-select com arrays e UI de checkboxes |

