

# Refatoração RLS — Migration SQL

## O que será feito

Uma única migration SQL que consolida políticas duplicadas, aplica `(select auth.uid())` para avaliação única por query, e adiciona indexes faltantes.

## Detalhes da Migration

### 1. Profiles — SELECT (4 → 2 políticas)
- **DROP**: `Users can view own profile`, `Admins can view all profiles`, `Users can view profiles in their agencies`
- **CREATE** `profiles_select` com EXISTS otimizado (conforme solicitado):
```sql
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  user_id = (select auth.uid())
  OR EXISTS (
    SELECT 1 FROM agency_users au1
    JOIN agency_users au2 ON au1.agency_id = au2.agency_id
    WHERE au1.user_id = profiles.user_id 
    AND au2.user_id = (select auth.uid())
  )
  OR is_admin()
);
```
- **Manter**: `Super admins can view all profiles` (ALL) — sem alterar
- **Atualizar** INSERT e UPDATE para usar `(select auth.uid())`

### 2. Agencies — SELECT (3 → 1 política)
- **DROP**: `Users can view their agencies`, `Master agency admins can view all agencies`, `Master users can view all agency data`
- **CREATE** `agencies_select` consolidada com `(select auth.uid())`

### 3. Agencies — UPDATE (3 → 1 política)  
- **DROP**: as 3 políticas UPDATE
- **CREATE** `agencies_update` consolidada com USING + WITH CHECK

### 4. Agency Subscriptions — otimizar auth.uid()
- A política `Agency members can view their subscription` já usa `user_belongs_to_agency()` (security definer) — OK
- Sem alteração necessária (funções security definer já evitam per-row eval)

### 5. Notifications + Notification Preferences — `(select auth.uid())`
- Recriar políticas SELECT/UPDATE/INSERT/DELETE que usam `auth.uid() = user_id` para `(select auth.uid()) = user_id`

### 6. Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_notification_preferences_agency_id ON notification_preferences(agency_id);
CREATE INDEX IF NOT EXISTS idx_notification_event_preferences_agency_id ON notification_event_preferences(agency_id);
```

### Nota sobre recursão
- `is_admin()` consulta `profiles.role` — mas é `SECURITY DEFINER`, bypassa RLS. Sem risco de loop.
- `is_master_agency_admin()` consulta `agency_users` — sem relação circular com `profiles` ou `agencies`.

## Impacto
- ~10 políticas redundantes removidas
- `auth.uid()` avaliado 1x por query nas tabelas mais acessadas
- EXISTS com JOIN nos profiles para máximo uso de índices
- 2 indexes adicionais para notification tables

## Arquivo
- 1 migration SQL via migration tool

