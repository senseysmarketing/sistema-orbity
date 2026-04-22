

# RBAC Híbrido — Implementação Final com Guardrails de Segurança

## Mudanças vs plano anterior

Incorpora os 3 guardrails: cobertura total de rotas, fallback null-safe no hook, e ocultação de categorias vazias no sidebar.

## 1. Migração SQL

```sql
ALTER TABLE public.agency_users 
  ADD COLUMN IF NOT EXISTS custom_role TEXT;

ALTER TABLE public.agency_users 
  ADD COLUMN IF NOT EXISTS app_permissions JSONB 
  DEFAULT '{"crm": true, "tasks": true, "financial": false, "traffic": false, "social_media": false, "agenda": true}'::jsonb;
```

## 2. Catálogo — `src/lib/rolePresets.ts` (novo)

6 presets (Designer, Social Media, Gestor de Tráfego, Comercial, Gerente, Personalizado) + constante `DEFAULT_PERMISSIONS` exportada para fallback do hook.

## 3. Hook `usePermissions` — `src/hooks/usePermissions.tsx` (novo)

- Lê `agency_users` filtrando por `user_id` + `agency_id`. Cache React Query (staleTime 5min).
- **Fallback null-safe (Guardrail 2)**:
  ```ts
  const perms = data?.app_permissions ?? DEFAULT_PERMISSIONS;
  ```
- **Bypass admin**: `owner` / `admin` / `super_admin` → todos os flags `true`.
- Retorna: `loading, permissions, customRole, canAccessCRM, canAccessTasks, canAccessFinancial, canAccessTraffic, canAccessSocialMedia, canAccessAgenda, isAdmin`.

## 4. UI — `src/components/admin/RolePermissionsManager.tsx` (novo)

Dialog acionado em `UsersManagement.tsx` (entrada "Permissões" no dropdown de ações):
- Select de cargo com 6 presets (emoji + nome). Auto-detecta preset pelo `app_permissions` atual.
- Card com 6 toggles `Switch` (CRM, Tarefas, Agenda, Social Media, Tráfego, Financeiro) + ícone Lucide + descrição.
- Salvar: `update agency_users set custom_role, app_permissions` + invalida cache.
- Bloqueia edição de owner/admin e auto-edição.

## 5. Cobertura Total de Rotas (Guardrail 1)

Mapeamento completo — **zero rotas órfãs sensíveis**:

| Rota | Permissão exigida |
|---|---|
| `/dashboard` (Home) | universal (member+) |
| `/dashboard/reminders` (lembretes pessoais) | universal |
| `/dashboard/settings` (perfil próprio) | universal |
| `/dashboard/settings/notifications` | universal |
| `/dashboard/tasks` | `canAccessTasks` |
| `/dashboard/agenda` | `canAccessAgenda` |
| `/dashboard/crm` | `canAccessCRM` |
| `/dashboard/clients` | `canAccessCRM` |
| `/dashboard/clients/:id` | `canAccessCRM` |
| `/dashboard/social-media` | `canAccessSocialMedia` |
| `/dashboard/traffic` | `canAccessTraffic` |
| `/dashboard/admin` (financeiro) | `canAccessFinancial` |
| `/dashboard/contracts` | `canAccessFinancial` |
| `/dashboard/goals` | `canAccessFinancial` |
| `/dashboard/nps` | `canAccessCRM` |
| `/dashboard/reports` | `isAdmin` |
| `/dashboard/import` | `isAdmin` |
| `/dashboard/master` | `isAdmin` (já protegido) |

## 6. Wrapper — `src/components/auth/RequirePermission.tsx` (novo)

```tsx
<RequirePermission permission="canAccessFinancial">{children}</RequirePermission>
```
- Loading → spinner.
- Sem permissão → tela "Acesso Restrito" (Card centralizado, ícone Lock, copy "Você não tem permissão para acessar este módulo. Fale com o administrador da agência.").
- Aceita prop `requireAdmin` para rotas admin-only (Reports, Import).

`App.tsx`: envolver as 13 rotas protegidas listadas acima.

## 7. Ocultação Dinâmica no Sidebar (Guardrail 3)

`src/components/layout/AppSidebar.tsx`:
- Cada item ganha campo `permission?: keyof Permissions | 'isAdmin'`.
- Filtrar `category.items` pelo hook.
- **Após filtrar, se `filtered.length === 0` → não renderizar `SidebarGroup` inteiro** (sem `SidebarGroupLabel`, sem espaço em branco).
- Itens universais (Dashboard, Lembretes, Configurações) sem prop `permission` → sempre visíveis.

`src/components/layout/MobileBottomNav.tsx`:
- Filtrar `navItems` (Tarefas, CRM, Agenda) pelas permissões.
- Home e botão "Mais" sempre visíveis.

## Fluxo do Designer (foco extremo)

Designer marcado com preset 🎨 → permissões: `{tasks:true, resto:false}`.
Sidebar renderiza: **Dashboard, Tarefas Gerais, Lembretes, Configurações**. Nada mais. Categorias "CRM", "Social Media", "Tráfego", "Administrativo" desaparecem por completo (sem labels órfãos).

## Garantias

| # | Garantia |
|---|---|
| 1 | RLS Supabase intacto: `owner`/`admin`/`member` controlam dados; `app_permissions` é UX. |
| 2 | Bypass total para owner/admin/super_admin — nunca ficam bloqueados. |
| 3 | Zero rotas órfãs sensíveis: Clientes, Contratos, Goals, Reports, Import todos cobertos. |
| 4 | Fallback `DEFAULT_PERMISSIONS` evita crash em registros pré-migration. |
| 5 | Sidebar oculta categorias 100% filtradas — sem labels vazios. |
| 6 | Cache 5min, sem custo extra de query por navegação. |

## Ficheiros

**Novos**:
- `src/lib/rolePresets.ts`
- `src/hooks/usePermissions.tsx`
- `src/components/admin/RolePermissionsManager.tsx`
- `src/components/auth/RequirePermission.tsx`

**Alterados**:
- `src/components/admin/UsersManagement.tsx` — entrada "Permissões".
- `src/components/layout/AppSidebar.tsx` — filtro + ocultação de categorias vazias.
- `src/components/layout/MobileBottomNav.tsx` — filtro de itens.
- `src/App.tsx` — wrappers `RequirePermission` em 13 rotas.

**Migração**: 2 `ALTER TABLE` em `agency_users`.

