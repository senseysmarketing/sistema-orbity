

# Fix: Master Admin nao consegue suspender agencias

## Diagnostico

O problema e de **RLS (Row Level Security)** na tabela `agencies`. Quando voce faz o update com `.select('id')`, o Supabase exige que tanto a policy de UPDATE quanto a de SELECT sejam satisfeitas.

**Policies atuais de SELECT na tabela `agencies`:**
1. `Users can view their agencies` — so mostra agencias que o usuario pertence
2. `Master users can view all agency data` — usa `is_master_user()` que verifica `profiles.role = 'administrador'`

**Seu perfil tem `role = 'agency_admin'`**, nao `'administrador'`. Entao `is_master_user()` retorna `false`.

A policy de UPDATE (`is_master_agency_admin()`) passa corretamente, mas como nao ha policy de SELECT que cubra master agency admins, o `.select('id')` retorna array vazio — e o codigo interpreta como "sem permissao".

## Solucao

### 1. Criar nova policy SELECT na tabela `agencies`

Adicionar uma policy que permita master agency admins visualizarem todas as agencias:

```sql
CREATE POLICY "Master agency admins can view all agencies"
ON public.agencies
FOR SELECT
TO authenticated
USING (is_master_agency_admin());
```

Isso garante que o `.select('id')` apos o update retorne dados.

### 2. Nenhuma alteracao de codigo necessaria

O codigo do `useMaster.tsx` ja esta correto. O problema e exclusivamente de RLS no banco.

## Arquivo modificado

| Local | Alteracao |
|-------|-----------|
| Migration SQL | Nova policy SELECT `is_master_agency_admin()` na tabela `agencies` |

