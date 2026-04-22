

# Ajuste — Menu lateral completo + bloqueio por permissão na tela

## Objetivo

Voltar a exibir **todos os itens do menu lateral** para todos os membros (independente das permissões), mantendo o sistema novo de permissões por toggle. O bloqueio passa a acontecer **apenas dentro da página** via `RequirePermission` (tela "Acesso Restrito" já existente), não mais por ocultação no menu.

## Diagnóstico

Hoje o menu lateral filtra itens com base em `usePermissions()` — designer só vê "Tarefas", causando sensação de app vazio. O `RequirePermission` já está implementado e funcional em todas as rotas restritas (CRM, Financeiro, Tráfego, Social Media, Agenda, Tarefas), mostrando uma tela elegante "Acesso Restrito" com ícone de cadeado quando o usuário não tem permissão.

A correção é trivial: remover o filtro de permissões do componente do menu lateral. Os bloqueios continuam funcionando dentro das páginas.

## Correção

### 1. `src/components/layout/AppSidebar.tsx` (ou equivalente)

- Remover qualquer chamada a `usePermissions()` usada para filtrar itens do menu.
- Remover lógica condicional do tipo `if (!perms.canAccessCRM) return null` ou `.filter(item => perms[item.permission])`.
- Renderizar **todos** os itens do menu para qualquer usuário autenticado da agência.
- Manter apenas filtros legítimos não-relacionados a permissão (ex: itens exclusivos de admin como "Painel de Controle" se for o caso — confirmar no código).

### 2. Comportamento resultante

- **Designer** vê no menu: Dashboard, Clientes, Tarefas, Lembretes, Agenda, CRM & Leads, Social Media, Tráfego, Contratos, NPS, Metas, Administrativo, Importação, Configurações — igual ao admin.
- Ao clicar em "CRM & Leads" sem permissão → tela "Acesso Restrito" do `RequirePermission` (já existe, sem mudanças).
- Ao clicar em "Tarefas" (com permissão) → acesso normal.
- Admin/Owner: nenhuma mudança visível (já viam tudo).

### 3. Validação rápida

- Confirmar que rotas sensíveis (`/crm`, `/financial`, `/traffic`, `/social-media`, `/agenda`, `/tasks`) continuam envolvidas por `<RequirePermission permission="..."/>` no roteador. Se alguma rota foi removida do `RequirePermission` quando o filtro do menu foi adicionado, restaurar.

## Ficheiros alterados

- `src/components/layout/AppSidebar.tsx` (ou nome equivalente do componente do menu lateral) — remover filtragem por permissões.
- (Se necessário) Roteador principal — garantir que `RequirePermission` envolve as rotas restritas.

## Sem mudanças

- `usePermissions`, `RequirePermission`, `RolePermissionsManager`, banco de dados, Edge Functions — intactos.
- Sistema de toggle de permissões continua funcionando exatamente como está.
- Tela "Acesso Restrito" mantém o design atual.

