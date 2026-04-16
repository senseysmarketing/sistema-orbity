

# Reintegração de CRUD com Guardrails UX

## Nota sobre o tema
O `ClientDetail.tsx` actual está em **light mode** (bg-white, border, shadow-sm) — foi convertido anteriormente. Os botões de micro-ação seguirão o estilo light consistente: `variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"`.

---

## Ficheiros alterados

### 1. `src/components/agenda/MeetingFormDialog.tsx`
- Adicionar prop `defaultClientIds?: string[]` à interface `MeetingFormDialogProps`
- No `useEffect` de inicialização (bloco `else if (!open)` / caso sem meeting/duplicate/prefilled), se `defaultClientIds` existir, fazer `setSelectedClientIds(defaultClientIds)`
- Isto permite abrir o dialog já com o cliente pré-selecionado

### 2. `src/pages/ClientDetail.tsx`
Adicionar estado e dialogs inline:

**Estado:**
```typescript
const [editFormOpen, setEditFormOpen] = useState(false);
const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
const [quickTaskDialogOpen, setQuickTaskDialogOpen] = useState(false);
const [newCred, setNewCred] = useState({ platform: '', username: '', password: '' });
const [quickTask, setQuickTask] = useState({ title: '', task_type: '', due_date: '' });
```

**Header — botão Editar + Drive dinâmico:**
- Adicionar botão "Editar" (`variant="outline" size="sm"` com ícone `Edit2`) que abre `ClientForm` com `client={client}`
- Botão Drive: se `client.observations` contiver URL de drive, usar; senão `disabled` e ao clicar abre o edit form

**Micro-ações nos cards (light mode):**

| Card | Botão | Acção |
|------|-------|-------|
| Vault de Acessos | `Plus` ghost | Abre `credentialDialogOpen` — Dialog inline com 3 campos (Plataforma, Login, Senha), INSERT em `client_credentials` |
| Últimas Reuniões | `CalendarPlus` ghost | Abre `meetingDialogOpen` — `MeetingFormDialog` com `defaultClientIds={[id!]}` |
| Próximas Tarefas | `Plus` ghost | Abre `quickTaskDialogOpen` — Dialog inline "Tarefa Rápida" (Título, Tipo, Data), INSERT em `tasks` + `task_clients` |

**Quick Task Dialog:**
- Campos: Título (Input), Tipo (Select com opções da tabela `task_types` ou valores comuns), Data de Entrega (Input date)
- Insert: `tasks` com `agency_id`, `title`, `task_type`, `due_date`, `status: 'todo'`, depois `task_clients` com `client_id`
- `onSuccess`: invalidar `client-dashboard`

**Credential Dialog:**
- Campos: Plataforma, Login, Senha
- Insert: `client_credentials` com `client_id`, `agency_id`
- `onSuccess`: invalidar `client-dashboard`

**Dialogs finais (antes do `</div>` final):**
- `<ClientForm open={editFormOpen} onOpenChange={setEditFormOpen} client={client} onSuccess={...} />`
- `<MeetingFormDialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen} defaultClientIds={[id!]} />`
- Dialog inline de credenciais
- Dialog inline de tarefa rápida

---

## Ficheiros alterados
1. `src/components/agenda/MeetingFormDialog.tsx` — +prop `defaultClientIds`
2. `src/pages/ClientDetail.tsx` — +botão Editar, +Drive dinâmico, +3 micro-ações, +3 dialogs inline

## Guardrails
- Zero navegação para fora da página
- Reutiliza `ClientForm` e `MeetingFormDialog` existentes
- Nenhuma alteração no banco de dados
- Queries invalidadas após mutações
- Estilo light mode consistente com o tema actual

