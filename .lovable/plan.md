
# Seletor de Usuarios no Painel de Detalhes + Correcao de Sincronizacao

## Problemas Identificados

1. **Sem seletor de usuario no painel lateral (ContentPlanDetailsSheet)**: Quando o usuario abre um planejamento salvo e decide criar tarefas depois, nao ha como atribuir responsaveis.

2. **Dados desatualizados apos criar tarefas**: O painel lateral usa uma copia estatica do plano (`selectedPlan`). Quando tarefas sao criadas, a query e invalidada e o card no fundo atualiza corretamente, mas o painel lateral continua mostrando os dados antigos (ex: card mostra 2/5, sheet mostra 1/5).

## Alteracoes

### 1. ContentPlanDetailsSheet.tsx
- Adicionar `MultiUserSelector` acima do botao "Criar Tarefas", permitindo selecionar responsaveis
- Buscar usuarios da agencia via `agency_users` + `profiles` (mesmo padrao do Wizard)
- Passar os `assignedUserIds` selecionados para a funcao `onCreateTasks`
- Atualizar a interface `onCreateTasks` para aceitar um terceiro parametro `assignedUserIds`

### 2. ContentPlanningList.tsx - Correcao de sincronizacao
- Ao inves de manter `selectedPlan` como snapshot estavel, derivar o plano exibido diretamente do array `plans` usando o ID
- Guardar apenas `selectedPlanId` (string) em vez de `selectedPlan` (objeto)
- Criar um `useMemo` que busca o plano atualizado: `plans.find(p => p.id === selectedPlanId)`
- Isso garante que quando a query `content-plans` e invalidada e os dados novos chegam, o painel lateral reflete automaticamente

### 3. Ajuste no fluxo de onCreateTasks no ContentPlanningList
- Passar os `assignedUserIds` recebidos do sheet para `createTasksFromItems`

## Detalhes Tecnicos

**ContentPlanDetailsSheet.tsx:**
- Importar `MultiUserSelector` de `@/components/tasks/MultiUserSelector`
- Importar `useAgency` para obter o `agency_id`
- Query local para buscar usuarios: `supabase.from("agency_users").select("user_id, role, profiles(full_name)").eq("agency_id", agencyId)`
- Estado local `assignedUserIds: string[]` para controlar a selecao
- Exibir o seletor entre o checkbox "selecionar todos" e a lista de itens
- Label: "Responsaveis pelas tarefas"

**ContentPlanningList.tsx:**
```text
// Antes (snapshot estatico):
const [selectedPlan, setSelectedPlan] = useState<ContentPlan | null>(null);

// Depois (derivado dos dados atualizados):
const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
const selectedPlan = useMemo(() => plans.find(p => p.id === selectedPlanId) || null, [plans, selectedPlanId]);
```

**Assinatura atualizada de onCreateTasks:**
```text
onCreateTasks: (planId: string, itemIds: string[], assignedUserIds?: string[]) => Promise<boolean>
```
Isso ja e compativel com a funcao `createTasksFromItems` existente no hook que ja aceita `assignedUserIds` como terceiro parametro.
