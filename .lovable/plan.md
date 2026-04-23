

# Excluir Agência Permanentemente (apenas suspensas/canceladas/trial expirado)

## Comportamento

Adiciona item **"Excluir Permanentemente"** (vermelho, ícone `Trash2`) no menu de três pontinhos da `AgenciesTable`. Aparece **somente** quando `computed_status` for `suspended`, `canceled` ou `trial_expired` — para agências `active`, `trialing` ou `past_due` o item nem é renderizado.

## Guardrail de confirmação (duplo)

Modal `AlertDialog` com:
- Título: "Excluir agência permanentemente?"
- Descrição listando o impacto: "Esta ação removerá **todos os dados** desta agência: usuários, clientes, leads, tarefas, posts, contratos, pagamentos, despesas, integrações e arquivos. **Não há como desfazer.**"
- Resumo dinâmico: `{user_count} usuários · {client_count} clientes · {task_count} tarefas`
- **Input de confirmação obrigatório**: usuário precisa digitar o nome exato da agência para liberar o botão "Excluir Permanentemente"
- Botão final em `variant="destructive"`, com loading state

## Edge Function `master-delete-agency`

Nova edge `verify_jwt = true` que:

1. Valida JWT do chamador e confirma que é admin/owner da agência master (`is_master_agency_admin()` via RPC)
2. Busca a agência alvo e valida que **não está ativa** (`is_active = false` OU `subscription_status IN ('canceled', 'trial')` com `trial_end < now()`). Se estiver ativa, retorna `403`.
3. Bloqueia exclusão da própria agência master (`7bef1258-af3d-48cc-b3a7-f79fac29c7c0`)
4. Usa `SUPABASE_SERVICE_ROLE_KEY` para executar exclusão em cascata via uma RPC `delete_agency_cascade(p_agency_id)` (criada na migration), que apaga em ordem segura respeitando FKs:
   - Tabelas dependentes sem FK cascade: `notifications`, `notification_queue`, `notification_tracking`, `notification_preferences`, `notification_event_preferences`, `agency_notification_rules`
   - Pipeline CRM: `lead_history`, `leads`, `automation_logs`, `whatsapp_automations`, `whatsapp_messages`
   - Operacional: `task_assignments`, `task_clients`, `tasks`, `meetings`, `posts`, `reminders`, `goals`, `nps_responses`
   - Financeiro: `payments`, `expenses`, `cash_flow`, `contracts`, `contract_templates`, `billing_*`, `invoices`
   - Integrações: `facebook_*`, `meta_*`, `google_*`, `whatsapp_instances`, `evolution_*`, `conexa_*`, `asaas_*`, `traffic_*`
   - Storage: deleta objetos dos buckets `client-files`, `task-attachments`, `post-attachments` filtrando por prefixo `{agency_id}/`
   - `agency_subscriptions`, `agency_invitations`, `agency_users`, `agencies` (último)
5. Tudo dentro de uma transação (`BEGIN/COMMIT`); rollback em caso de erro
6. Loga auditoria em tabela existente `audit_log` se houver, ou em `console.error/info` da edge

## Hook `useMaster` — novo método

```ts
deleteAgencyPermanently: (agencyId: string) => Promise<void>
```

Chama `supabase.functions.invoke('master-delete-agency', { body: { agency_id } })`, exibe toast de sucesso/erro e dispara `refreshAgencies()`.

## UI — `AgenciesTable.tsx`

Adicionar abaixo do item "Reativar":

```tsx
{(['suspended','canceled','trial_expired'] as const).includes(agency.computed_status) && (
  <>
    <DropdownMenuSeparator />
    <DropdownMenuItem 
      onClick={() => openDeleteDialog(agency)} 
      className="text-destructive focus:text-destructive"
    >
      <Trash2 className="h-4 w-4 mr-2" /> Excluir Permanentemente
    </DropdownMenuItem>
  </>
)}
```

Estado local `deleteDialogAgency` controla o `AlertDialog` com input de confirmação por nome.

## Migration

```sql
CREATE OR REPLACE FUNCTION public.delete_agency_cascade(p_agency_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  master_id uuid := '7bef1258-af3d-48cc-b3a7-f79fac29c7c0';
BEGIN
  IF p_agency_id = master_id THEN
    RAISE EXCEPTION 'Cannot delete master agency';
  END IF;

  -- DELETE em cascata na ordem correta (todas as tabelas com agency_id)
  DELETE FROM public.notifications WHERE agency_id = p_agency_id;
  DELETE FROM public.notification_queue WHERE agency_id = p_agency_id;
  -- ... (lista completa de tabelas filhas)
  DELETE FROM public.agency_subscriptions WHERE agency_id = p_agency_id;
  DELETE FROM public.agency_users WHERE agency_id = p_agency_id;
  DELETE FROM public.agencies WHERE id = p_agency_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_agency_cascade(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_agency_cascade(uuid) TO service_role;
```

A função só é executável via service role (chamada exclusivamente pela edge), nunca diretamente pelo cliente.

## Limpeza de Storage

Dentro da edge, antes da RPC SQL:

```ts
for (const bucket of ['client-files', 'task-attachments', 'post-attachments']) {
  const { data: files } = await supabase.storage.from(bucket).list(agency_id, { limit: 1000 });
  if (files?.length) {
    await supabase.storage.from(bucket).remove(files.map(f => `${agency_id}/${f.name}`));
  }
}
```

## Não-deleta usuários do `auth.users`

Usuários ficam na tabela `auth.users` (podem pertencer a outras agências). Apenas os vínculos em `agency_users` são removidos. Se o usuário não tiver mais nenhuma agência, ele simplesmente não consegue logar em nenhum painel — sem efeito colateral.

## Arquivos

**Novos:**
- `supabase/functions/master-delete-agency/index.ts`
- `supabase/functions/master-delete-agency/config.toml` (`verify_jwt = true`)
- Migration: RPC `delete_agency_cascade`

**Editados:**
- `src/components/master/AgenciesTable.tsx` — item de menu condicional + `AlertDialog` de confirmação com input
- `src/hooks/useMaster.tsx` — método `deleteAgencyPermanently`

## Sem mudanças

- Schema das demais tabelas, RLS, billing, edges existentes
- Agência master (protegida no RPC + na edge)
- Outras abas do painel master

