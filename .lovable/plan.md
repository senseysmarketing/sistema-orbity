

# Fix: Suspensao de Agencia + Tela de Acesso Suspenso

## Problema 1: Suspensao nao funciona
A funcao `suspendAgency` faz `supabase.from('agencies').update({ is_active: false })`. A RLS policy de UPDATE usa `is_master_user()` que verifica `profiles.role = 'administrador'`. Porem o admin master e identificado via `is_master_agency_admin()` (tabela `agency_users`). Se o perfil nao tem `role = 'administrador'`, a RLS bloqueia silenciosamente (0 rows, sem erro), e o toast mostra sucesso falso.

## Problema 2: Tela de suspensao
A `BlockedAccessScreen` atual ja detecta `agencySuspended` mas mostra a mesma tela generica. Precisa de uma tela dedicada para suspensao administrativa.

## Correcoes

### 1. Migration: Adicionar RLS policy correta
```sql
CREATE POLICY "Master agency admins can update all agencies"
ON public.agencies FOR UPDATE
USING (public.is_master_agency_admin())
WITH CHECK (public.is_master_agency_admin());
```

### 2. `useMaster.tsx`: Validar resultado do update
Apos o `.update()`, verificar se houve rows afetadas. Se `count === 0` e sem erro, mostrar toast de erro informando que a operacao nao teve efeito.

### 3. `PaymentMiddlewareWrapper.tsx`: Diferenciar suspensao de bloqueio financeiro
Passar prop `reason` para `BlockedAccessScreen` indicando se e suspensao administrativa vs inadimplencia.

### 4. `BlockedAccessScreen.tsx`: Tela dedicada para suspensao
Quando `reason === 'suspended'`:
- Icone de Ban (vermelho)
- Titulo: "Acesso Suspenso pelo Administrador"
- Mensagem: "O acesso da sua agencia foi suspenso. Entre em contato com o suporte para mais informacoes."
- Botoes: WhatsApp suporte + Sair da conta
- Sem botao de pagamento ou retry

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| Migration SQL | Nova RLS policy com `is_master_agency_admin()` |
| `src/hooks/useMaster.tsx` | Validar count do update |
| `src/components/payment/PaymentMiddlewareWrapper.tsx` | Passar reason para BlockedAccessScreen |
| `src/components/payment/BlockedAccessScreen.tsx` | Tela dedicada para suspensao |

