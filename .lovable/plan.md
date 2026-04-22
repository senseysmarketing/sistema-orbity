

# Ajustes — Aba Usuários

## 1. `src/pages/Settings.tsx` (linhas 376-391)

Reorganizar o header da aba "Usuários" para layout horizontal: título à esquerda, botão **Criar Usuário** à direita na mesma linha.

```
┌─────────────────────────────────────────────────────────┐
│  Gerenciar Usuários                    [+ Criar Usuário]│
│  Gerencie os membros da sua agência...                  │
└─────────────────────────────────────────────────────────┘
```

- Trocar o `<div>` simples por um `flex items-start justify-between`.
- Renderizar `<UsersManagement showCreateButton={false} />` (a tabela passa a ficar abaixo, sem o botão duplicado).
- O botão **Criar Usuário** será extraído como sub-componente exportado de `UsersManagement.tsx` (`<CreateUserButton />`) e renderizado no header de Settings, mantendo toda a lógica do Dialog encapsulada.

## 2. `src/components/admin/UsersManagement.tsx`

### A. Remover o `Card` wrapper do conteúdo (linhas 309-381)
- Eliminar `<Card>`, `<CardHeader>` (que tinha o botão sozinho gerando espaço vazio) e `<CardContent>`.
- A tabela passa a renderizar diretamente dentro de uma `div` simples com borda sutil (`rounded-lg border`).
- O Dialog "Criar Usuário" + estados (`inviteDialogOpen`, `inviteName`, etc.) são extraídos para um componente interno **`CreateUserButton`** que recebe `agencyId` + `onCreated` como props e é exportado para uso em Settings.tsx.

### B. Nova coluna **Permissões** na tabela

Estrutura atualizada:
```
| Usuário | Email | Função | Permissões | Membro desde | Ações |
```

**Lógica da coluna:**
- Para `owner` / `admin` → badge único `"Acesso Total"` (variant outline, cor primary).
- Para `member` → mapear `user.app_permissions` (fallback `DEFAULT_PERMISSIONS`) e renderizar uma badge pequena para cada módulo ativo:

| Chave | Label | Ícone (lucide) |
|---|---|---|
| `crm` | CRM | Users |
| `tasks` | Tarefas | CheckSquare |
| `financial` | Financeiro | DollarSign |
| `traffic` | Tráfego | TrendingUp |
| `social_media` | Social | Share2 |
| `agenda` | Agenda | Calendar |

- Badges com `variant="secondary"`, `text-xs`, ícone `h-3 w-3`, agrupadas com `flex flex-wrap gap-1`.
- Se o usuário tiver um `custom_role`, exibir esse nome como badge primária (ex: "Designer 🎨") **acima** das badges de módulos.
- Se não houver nenhuma permissão ativa: badge muted `"Sem acesso"`.

### C. Header da coluna **Ações**
- Manter como está (já enxuto após refactor anterior).

## 3. Comportamento responsivo

- Em mobile (`< md`), a coluna **Permissões** colapsa via `hidden md:table-cell` para não quebrar o layout. As permissões continuam acessíveis ao abrir "Permissões" no menu de ações.

## Ficheiros alterados

- `src/pages/Settings.tsx` — header horizontal da aba Usuários, monta `<CreateUserButton />` ao lado do título.
- `src/components/admin/UsersManagement.tsx`
  - Remove `Card`/`CardHeader`/`CardContent` wrapper.
  - Extrai e exporta `CreateUserButton` (Dialog + lógica de criação).
  - Adiciona coluna **Permissões** com badges por módulo + tratamento para owner/admin/custom_role.
  - Tabela passa a viver dentro de `div.rounded-lg.border`.

## Sem mudanças

- Nenhuma migração SQL.
- Nenhuma Edge Function.
- Lógica de permissões (`usePermissions`, `RolePermissionsManager`) intocada.

