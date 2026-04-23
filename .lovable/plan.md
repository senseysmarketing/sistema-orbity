

# Verificação de impacto: nova policy RLS em `agency_subscriptions`

## Pergunta
A policy permitindo `INSERT` de `orbity_trial` (e qualquer operação) por master admins impacta algo no sistema?

## Análise

A mudança proposta é **aditiva e segura**. Detalhes:

### O que a policy faz
```sql
CREATE POLICY "Master admins can manage all subscriptions"
ON public.agency_subscriptions
FOR ALL
TO authenticated
USING (public.is_master_agency_admin())
WITH CHECK (public.is_master_agency_admin());
```

- **Adiciona** uma permissão extra (apenas para owners/admins da agência Senseys).
- **Não remove, modifica ou substitui** nenhuma policy existente.
- No Postgres RLS, policies são **OR-combinadas**: agências comuns continuam restritas pelas policies atuais (`is_agency_admin`, `user_belongs_to_agency`), apenas master ganha um caminho a mais.

### Quem é afetado
- **Master admins (Senseys)**: ganham SELECT/INSERT/UPDATE/DELETE em qualquer linha. É exatamente o que você quer no painel master.
- **Agências comuns**: comportamento idêntico ao atual — só veem/editam a própria assinatura. Zero impacto.
- **Usuários sem login**: continuam bloqueados (policy é `TO authenticated`).

### Pontos do sistema que tocam `agency_subscriptions` (verificados)

| Local | Operação | Impacto |
|---|---|---|
| Trigger `initialize_agency_subscription` (cria trial ao registrar agência) | INSERT | Nenhum — roda como `SECURITY DEFINER`, ignora RLS |
| Função `start_agency_trial` | INSERT | Nenhum — `SECURITY DEFINER` |
| Edge function `check-subscription` (Stripe) | UPDATE | Nenhum — usa `SUPABASE_SERVICE_ROLE_KEY`, bypassa RLS |
| Webhooks Stripe | UPDATE | Nenhum — service role |
| Hook `useAgency` / `useSubscription` (front) | SELECT | Nenhum — policies de SELECT existentes continuam válidas |
| `AgencyDetailsSheet.handleSaveTrial` (painel master) | INSERT/UPDATE | **Passa a funcionar** ✅ |

### Riscos de segurança
- **Privilege escalation?** Não. `is_master_agency_admin()` é `SECURITY DEFINER STABLE` e checa pertencimento real à agência Senseys (`7bef1258-...`) com role `owner` ou `admin`. Não há como um usuário comum forjar isso.
- **Recursão RLS?** Não. A função consulta `agency_users`, não `agency_subscriptions`.
- **Vazamento entre agências?** Não. Apenas usuários da Senseys com role admin/owner ganham acesso — exatamente quem já tem acesso ao painel master via `isMasterAgencyAdmin()` no front.

### Coerência arquitetural
A função `is_master_agency_admin()` **já é usada em outras policies** do sistema (agencies, profiles, agency_users, billing_history, etc.) seguindo exatamente esse padrão. Estamos só fechando uma lacuna em `agency_subscriptions`.

## Conclusão
**Mudança 100% segura e aditiva.** Nenhum fluxo existente quebra. Apenas o painel master passa a conseguir editar trials/assinaturas de qualquer agência — comportamento esperado e já aplicado a outras tabelas administrativas.

Posso prosseguir com a migration?

