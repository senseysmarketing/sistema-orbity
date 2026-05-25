## Remoção completa de NPS e Performance & PPR

### 1. Frontend — páginas, componentes, hooks
Deletar:
- `src/pages/Goals.tsx`, `src/pages/NPSPage.tsx`, `src/pages/PublicNPSSurvey.tsx`
- `src/components/goals/` (pasta inteira)
- `src/components/performance/` (pasta inteira, inclui `tabs/`)
- `src/hooks/usePPRPeriodData.ts`, `usePPRMutations.ts`, `usePPRAuditLogs.ts`, `usePPRAdjustments.ts`, `useBonusPeriods.ts`

### 2. Roteamento e navegação
- `src/App.tsx`: remover imports de `Goals`, `NPSPage`, `PublicNPSSurvey` e as rotas `/nps-survey`, `/dashboard/goals`, `/dashboard/nps`.
- `src/components/layout/AppSidebar.tsx`: remover itens "NPS" e "Performance & PPR" e o tipo `"canAccessNPS"`/`"canAccessGoals"` da união local.
- `src/components/auth/RequirePermission.tsx`: remover `"canAccessNPS"` e `"canAccessGoals"` do tipo.
- `src/hooks/usePermissions.tsx`: remover `canAccessNPS`, `canAccessGoals`, `nps`, `goals` (defaults, mapping e retorno).

### 3. ClientDetail
- `src/pages/ClientDetail.tsx`: remover busca em `nps_responses`, variáveis `npsResult`, `allNps`, `matchedNps`, `npsScore` e a prop `npsScore` passada para o card de overview (passar apenas o que restar; manter o restante da página intacto).

### 4. Edge functions e referências
- Deletar pasta `supabase/functions/calculate-ppr-period/` e remover da deploy via `supabase--delete_edge_functions`.
- `supabase/functions/ai-support-chat/index.ts`: remover a linha do roteador interno referente a `Metas & PPR | /dashboard/goals`.

### 5. Migration (DROP destrutivo)
Em ordem (respeitando FKs):
```sql
DROP TABLE IF EXISTS public.ppr_calculation_logs CASCADE;
DROP TABLE IF EXISTS public.ppr_employee_results CASCADE;
DROP TABLE IF EXISTS public.ppr_financial_adjustments CASCADE;
DROP TABLE IF EXISTS public.ppr_period_months CASCADE;
DROP TABLE IF EXISTS public.employee_scorecards CASCADE;
DROP TABLE IF EXISTS public.nps_responses CASCADE;
DROP TABLE IF EXISTS public.nps_tokens CASCADE;
DROP TABLE IF EXISTS public.nps_settings CASCADE;
DROP TABLE IF EXISTS public.bonus_periods CASCADE;
DROP TABLE IF EXISTS public.bonus_programs CASCADE;
```
Mais funções/triggers órfãs relacionadas (`calculate_ppr_*`, etc.) serão removidas via `CASCADE`/`DROP FUNCTION IF EXISTS` conforme aparecerem nas migrações originais.

### 6. Validação
- Build TypeScript deve passar (sem imports quebrados).
- Sidebar não exibe NPS/Performance.
- `/dashboard/goals` e `/nps-survey` retornam 404.

### Observações
- Ação destrutiva: todos os dados de NPS, scorecards, períodos PPR e bônus serão apagados permanentemente.
- A memória `mem://features/goals/bonus-system-architecture` ficará obsoleta; será removida após a aplicação.
