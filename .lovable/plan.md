

# Reintegração de CRUD na Smart Table e Dashboard do Cliente

## Resumo
Adicionar botões de criação/gestão na listagem, botão de edição no header do detalhe, e micro-ações (+) nos cards do Bento Grid — tudo reutilizando componentes existentes.

---

## Ficheiros alterados

### 1. `src/pages/Clients.tsx`

**Header — grupo de botões:**
- **"Novo Cliente"**: `variant="create"` com ícone `Plus`. Abre o `ClientForm` (de `@/components/admin/ClientForm.tsx`) com `open/onOpenChange` state. Props: `onSuccess` invalida query `clients-list`.
- **"Gerenciar Carteira"**: `variant="outline"` com ícone `Briefcase`. Navega para `/dashboard/admin` com toast informativo (a gestão de carteira vive no Command Center via `ClientManagementSheet`).

Posição: à direita do header, junto aos badges de contagem.

### 2. `src/pages/ClientDetail.tsx`

**Header — botão "Editar":**
- Botão `variant="outline" size="sm"` com ícone `Edit2` ao lado dos botões WhatsApp/Drive.
- Abre o `ClientForm` passando `client={client}` para modo edição. `onSuccess` invalida `client-detail`.

**Drive dinâmico:**
- Não existe campo `drive_folder_url` no DB. O botão Drive ficará `disabled` com tooltip "Sem link configurado". Ao clicar com Drive vazio, abre o modal de Editar Perfil para que o utilizador configure o link (via `observations` ou campo futuro).

**Micro-ações nos cards:**

- **Vault de Acessos**: Botão `Plus` (`variant="ghost" size="icon"`) no header do card. Abre um `Dialog` inline simples com campos (Plataforma, Login, Senha) que faz `INSERT` em `client_credentials` — lógica extraída do `ClientCredentials.tsx` existente (reutilizar padrão de mutation).

- **Últimas Reuniões**: Botão `CalendarPlus` no header. Abre o `MeetingFormDialog` (de `@/components/agenda/MeetingFormDialog.tsx`). O componente aceita `prefilledDateTime` mas não `client_id` direto nas props — será aberto vazio para o utilizador selecionar o cliente (já pré-contextualizado pela página).

- **Próximas Tarefas**: Botão `Plus` no header. Navega para `/dashboard/tasks?newTask=true` ou abre toast com link. O formulário de tarefas vive inline no `Tasks.tsx` (não é um Dialog reutilizável isolado), então a abordagem mais limpa é navegar com query param.

### 3. Componentes reutilizados (sem alteração)
- `ClientForm` — já suporta criação e edição via prop `client`
- `MeetingFormDialog` — já é exportado e reutilizável
- `ClientCredentials` — padrão de mutation copiado para Dialog inline

---

## Detalhes técnicos

**Novo state em `Clients.tsx`:**
```typescript
const [clientFormOpen, setClientFormOpen] = useState(false);
```

**Novo state em `ClientDetail.tsx`:**
```typescript
const [editFormOpen, setEditFormOpen] = useState(false);
const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
// Credential form inline state
const [newCred, setNewCred] = useState({ platform: '', username: '', password: '' });
```

**Insert credencial (inline no ClientDetail):**
```typescript
await supabase.from("client_credentials").insert({
  client_id: id,
  agency_id: currentAgency.id,
  platform: newCred.platform,
  username: newCred.username,
  password: newCred.password,
});
```

**Estilo dos botões micro-ação:** `variant="ghost" size="icon"` com `className="h-7 w-7 text-muted-foreground hover:text-foreground"` — consistente com o tema light.

---

## Guardrails
- Reutiliza `ClientForm` e `MeetingFormDialog` existentes, zero duplicação
- Nenhuma alteração no banco de dados
- Queries invalidadas após mutações para refresh automático
- Botões dentro dos cards usam estilo ghost minimalista (light mode)

