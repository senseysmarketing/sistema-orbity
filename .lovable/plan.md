

# Permissões granulares por tela (separadas por categoria do menu)

## Problema atual

Apenas 6 toggles (`crm`, `tasks`, `financial`, `traffic`, `social_media`, `agenda`) controlam **15+ telas**, causando:
- **Clientes** bloqueado junto com CRM (mesma chave `canAccessCRM`)
- **NPS** amarrado a CRM, **Contratos** a Financeiro, **Metas** a Financeiro — sem controle individual
- **Lembretes** sem permissão (sempre aberto), **Relatórios** apenas admin
- Cargos preset jogam tudo junto, sem nuance

## Solução: 13 permissões agrupadas por categoria do sidebar

Mantém a estrutura atual (`agency_users.app_permissions` JSONB, sem migration de schema) e expande as chaves. Default `true` para retrocompatibilidade — ninguém perde acesso após o deploy.

### Novo `AppPermissions` (em `src/lib/rolePresets.ts`)

```ts
export interface AppPermissions {
  // Operacional
  clients: boolean;       // NOVO — separa de CRM
  tasks: boolean;
  reminders: boolean;     // NOVO
  agenda: boolean;
  crm: boolean;           // CRM & Leads (pipeline)

  // Marketing & Vendas
  social_media: boolean;
  traffic: boolean;
  contracts: boolean;     // NOVO — separa de financial

  // Administração
  nps: boolean;           // NOVO — separa de CRM
  goals: boolean;         // NOVO — separa de financial
  financial: boolean;     // Administrativo (DRE/Caixa)
  reports: boolean;       // NOVO — deixa de ser admin-only opcional
  import_data: boolean;   // NOVO — idem
}

export const DEFAULT_PERMISSIONS: AppPermissions = {
  clients: true, tasks: true, reminders: true, agenda: true, crm: true,
  social_media: false, traffic: false, contracts: false,
  nps: false, goals: false, financial: false, reports: false, import_data: false,
};
```

**Fallback retrocompatível** em `usePermissions`: se o JSONB salvo não tiver a nova chave, herdar do agrupamento antigo (ex.: `clients ?? crm`, `nps ?? crm`, `contracts ?? financial`, `goals ?? financial`, `reminders ?? true`, `reports/import_data ?? isAdmin`). Isso garante que ninguém é bloqueado sem o admin reconfigurar.

### Cargos preset atualizados

Cada preset em `ROLE_PRESETS` ganha valores explícitos para as 13 chaves. Exemplos:
- **Designer**: `tasks`, `reminders` ✓ — resto ✗
- **Social Media**: `tasks`, `reminders`, `agenda`, `social_media` ✓
- **Gestor de Tráfego**: `tasks`, `reminders`, `agenda`, `clients`, `crm`, `traffic`, `reports` ✓
- **Comercial**: `reminders`, `agenda`, `clients`, `crm`, `nps`, `contracts` ✓
- **Gerente**: tudo ✓ exceto `financial` e `import_data`
- **Personalizado**: livre

## UI — `RolePermissionsManager.tsx` agrupado por categoria

Substitui a lista única de 6 itens por **3 seções colapsáveis** espelhando o sidebar:

```
🗂  Operacional        [5/5 ativos]
    ├─ 👥 Clientes               [toggle]
    ├─ ✅ Tarefas                [toggle]
    ├─ 🔔 Lembretes              [toggle]
    ├─ 📅 Agenda                 [toggle]
    └─ 🎯 CRM & Leads            [toggle]

📣  Marketing & Vendas  [1/3 ativos]
    ├─ 📱 Social Media           [toggle]
    ├─ 📈 Tráfego                [toggle]
    └─ 📄 Contratos              [toggle]

⚙️  Administração      [0/5 ativos]
    ├─ 💚 NPS                    [toggle]
    ├─ 🏆 Metas & Bônus          [toggle]
    ├─ 💰 Administrativo (Fin.)  [toggle]
    ├─ 📊 Relatórios             [toggle]
    └─ ⬆️ Importação             [toggle]
```

- Header de cada seção com contador `n/total ativos` + chevron de expandir/recolher.
- Botão sutil **"Ativar tudo na seção"** / **"Desativar tudo"** ao lado do contador.
- `Switch` mantém o mesmo visual atual (Quiet Luxury, sem cores agressivas).
- Modal cresce: `max-w-2xl` + `max-h-[85vh] overflow-y-auto` para acomodar as seções sem perder densidade.

## `usePermissions` — novos campos derivados

```ts
canAccessClients, canAccessTasks, canAccessReminders, canAccessAgenda, canAccessCRM,
canAccessSocialMedia, canAccessTraffic, canAccessContracts,
canAccessNPS, canAccessGoals, canAccessFinancial, canAccessReports, canAccessImport
```

Admins (`isAdmin`) continuam retornando `true` em todos.

## Roteamento — `App.tsx`

Cada rota passa a usar a sua chave dedicada:

| Rota | Antes | Depois |
|---|---|---|
| `/clients` | `canAccessCRM` | `canAccessClients` |
| `/clients/:id` | `canAccessCRM` | `canAccessClients` |
| `/crm` | `canAccessCRM` | `canAccessCRM` |
| `/nps` | `canAccessCRM` | `canAccessNPS` |
| `/contracts` | `canAccessFinancial` | `canAccessContracts` |
| `/goals` | `canAccessFinancial` | `canAccessGoals` |
| `/admin` | `canAccessFinancial` | `canAccessFinancial` |
| `/reminders` | (livre) | `canAccessReminders` |
| `/reports` | `requireAdmin` | `canAccessReports` |
| `/import` | `requireAdmin` | `canAccessImport` |

`RequirePermission` ganha o novo union de `PermissionKey` (13 chaves).

## Sidebar — `AppSidebar.tsx`

Cada item aponta para sua chave correspondente:
- `Clientes → canAccessClients`
- `Lembretes → canAccessReminders`
- `Contratos → canAccessContracts` (item novo na seção Marketing & Vendas — hoje não está listado)
- `NPS → canAccessNPS`, `Metas & Bônus → canAccessGoals`
- `Importação → canAccessImport`, `Relatórios → canAccessReports`

`MobileBottomNav` permanece (Home/Tarefas/CRM/Agenda já corretos).

## `detectPresetFromPermissions`

Compara as 13 chaves. Qualquer divergência cai em "Personalizado".

## Fail-safe de retrocompatibilidade

No `usePermissions`, ao montar `perms`:

```ts
const raw = (data?.app_permissions ?? {}) as Partial<AppPermissions>;
const perms: AppPermissions = {
  clients:     raw.clients     ?? raw.crm ?? true,        // herda CRM antigo
  tasks:       raw.tasks       ?? true,
  reminders:   raw.reminders   ?? true,
  agenda:      raw.agenda      ?? true,
  crm:         raw.crm         ?? true,
  social_media:raw.social_media?? false,
  traffic:     raw.traffic     ?? false,
  contracts:   raw.contracts   ?? raw.financial ?? false, // herda financial
  nps:         raw.nps         ?? raw.crm ?? false,       // herda CRM
  goals:       raw.goals       ?? raw.financial ?? false, // herda financial
  financial:   raw.financial   ?? false,
  reports:     raw.reports     ?? false,
  import_data: raw.import_data ?? false,
};
```

Resultado: usuários atuais com `crm: true` continuam vendo Clientes; quem só tinha tasks continua só com tasks. **Nenhuma regressão.**

## Arquivos editados

- `src/lib/rolePresets.ts` — interface, defaults, presets atualizados, detect
- `src/hooks/usePermissions.tsx` — fallbacks retrocompatíveis + novos derivados
- `src/components/auth/RequirePermission.tsx` — `PermissionKey` expandida
- `src/components/admin/RolePermissionsManager.tsx` — UI agrupada em 3 seções com contadores e bulk toggle
- `src/components/layout/AppSidebar.tsx` — chaves por item (inclui `Contratos`)
- `src/App.tsx` — rotas com chaves dedicadas

## Sem mudanças

- Schema (`agency_users.app_permissions` JSONB já comporta novas chaves)
- RLS, edge functions, Master, billing
- `MobileBottomNav` (já correto)
- Lógica de admin/owner (continua bypass total)

