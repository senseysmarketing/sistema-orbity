

# Ajustes Visuais no Painel de Controle

## Alteracoes

### 1. `src/pages/Master.tsx`
- Trocar `container mx-auto py-6 space-y-6` por `space-y-4 md:space-y-6` (padrao global sem container fixo)
- Ajustar titulo para `text-2xl md:text-3xl` e subtitulo para `text-sm md:text-base`
- Remover aba "Planos" (TabsTrigger + TabsContent)
- Remover import de `SubscriptionPlansManager`
- Mudar grid de tabs de `grid-cols-5` para `grid-cols-4`

### 2. `src/components/master/AgenciesTable.tsx`
- Remover status cards de "Em Trial" e "Trial Expirado" do array `statusCards`
- Remover coluna "Plano" da tabela (TableHead + TableCell com `plan_name`)
- Remover referencias a `trialing` e `trial_expired` no `getStatusBadge`
- Remover casos `trialing` e `trial_expired` no `getSituationText`

### 3. `src/hooks/useMaster.tsx`
- Remover `trialing` e `trial_expired` do `getStatusCounts`

Nenhuma alteracao de banco de dados necessaria.

