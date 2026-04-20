

# Corrigir links da Central de Ajuda + Tour Guiado

## Problema
- `HelpCenter.tsx` navega para rotas antigas sem prefixo (`/`, `/crm`, `/tasks`, `/agenda`, `/social-media`, `/traffic`, `/admin`). Todas as rotas reais estão sob `/dashboard/*` (ver `App.tsx`).
- Resultado: clicar nos guias leva à Landing Page (rota `/`) ou cai no `NotFound`.
- Tour Guiado (`tourSteps.ts`) está consistente com `data-tour` da sidebar, mas o passo `admin` aparece para usuários não-admin (item da sidebar tem `requiresAdmin: true`), o que pode quebrar o highlight.

## Mudanças

### 1. `src/components/help/HelpCenter.tsx`
Atualizar todas as rotas do array `quickGuides` para o prefixo correto:

| Antes | Depois |
|---|---|
| `/` | `/dashboard` |
| `/crm` | `/dashboard/crm` |
| `/tasks` | `/dashboard/tasks` |
| `/agenda` | `/dashboard/agenda` |
| `/social-media` | `/dashboard/social-media` |
| `/traffic` | `/dashboard/traffic` |
| `/admin` | `/dashboard/admin` |

### 2. `src/components/tour/tourSteps.ts`
- Manter os 7 passos atuais (selectors `data-tour` já batem com a sidebar).
- O passo `admin` ficará oculto silenciosamente para não-admins porque o elemento `[data-tour="admin"]` não existe no DOM deles — verificar se o overlay do tour lida bem com target ausente. Se não, adicionar fallback no hook `useProductTour` para pular passos cujo target não exista no DOM.

### 3. (Opcional, mas alinha com a sidebar atual) `HelpCenter.tsx`
Adicionar entrada para **Relatórios** (`/dashboard/reports`, ícone `BarChart3`) já que existe na sidebar — mantém a Central de Ajuda completa.

## Ficheiros alterados
- `src/components/help/HelpCenter.tsx` (rotas + opcional novo guia Relatórios)
- `src/hooks/useProductTour.tsx` (skip seguro de passo com target ausente)

Sem migrations. Sem mudanças em queries ou edge functions.

