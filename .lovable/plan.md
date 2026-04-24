

# Orbity Fast-Track — Implementação Final (com Guardrails Aprovados)

## Resumo dos guardrails aplicados

1. **Validação 24h server-side via RPC** (`complete_fast_track`) — frontend nunca decide elegibilidade.
2. **Sem clear da flag pós-checkout** — anti-abandono; Stripe controla reuso do cupom.
3. **Confetti só dispara uma vez** — via flag `useRef` + checagem `onboarding_completed_at IS NULL`.

---

## 1. Migration (1 arquivo)

```sql
-- Colunas de controle
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS onboarding_discount_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_widget_dismissed BOOLEAN NOT NULL DEFAULT false;

-- RPC server-side: única autoridade sobre a janela de 24h
CREATE OR REPLACE FUNCTION public.complete_fast_track(agency_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_eligible BOOLEAN;
BEGIN
  -- Só atualiza se ainda não foi concluído (idempotente)
  UPDATE public.agencies
  SET
    onboarding_completed_at = NOW(),
    onboarding_discount_eligible = (EXTRACT(EPOCH FROM (NOW() - created_at))/3600 <= 24)
  WHERE id = agency_uuid
    AND onboarding_completed_at IS NULL
    AND public.is_agency_admin(agency_uuid)  -- Authorização: só admin/owner da própria agência
  RETURNING onboarding_discount_eligible INTO is_eligible;

  RETURN COALESCE(is_eligible, false);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_fast_track(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_fast_track(UUID) TO authenticated;
```

RLS de `agencies` já permite UPDATE por admins → função `SECURITY DEFINER` + check explícito de `is_agency_admin()` impede chamada para outra agência.

## 2. Novo componente `src/components/onboarding/OnboardingChecklist.tsx`

**Estrutura:**
- Hook interno `useOnboardingProgress(agencyId)`:
  - 5 queries paralelas com `count: 'exact', head: true` (zero payload):
    - `whatsapp_accounts` OR `facebook_connections` ≥1 → "Conectar Integração"
    - `clients` ≥1 → "Primeiro Cliente"
    - `leads` ≥1 → "Primeiro Lead"
    - `tasks` ≥1 → "Primeira Tarefa"
    - `agency_users` ≥2 → "Convidar Equipa"
  - `staleTime: 30s`, `refetchOnWindowFocus: true`.

**Lógica de conclusão (idempotente):**
```ts
const completionFiredRef = useRef(false);

useEffect(() => {
  const allDone = items.every(i => i.done);
  
  // Guardrails: só dispara UMA vez, e só se ainda não foi marcado no DB
  if (
    allDone &&
    !agency.onboarding_completed_at &&
    !completionFiredRef.current
  ) {
    completionFiredRef.current = true;
    
    (async () => {
      const { data: isEligible, error } = await supabase
        .rpc('complete_fast_track', { agency_uuid: agency.id });
      
      if (error) {
        completionFiredRef.current = false; // permite retry
        return;
      }
      
      // Refetch agency para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['agency', agency.id] });
      
      if (isEligible === true) {
        const { default: confetti } = await import('canvas-confetti');
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
        toast.success('🎉 Cupom de R$100 desbloqueado para sua primeira mensalidade!');
      }
    })();
  }
}, [items, agency.onboarding_completed_at, agency.id]);
```

**Layout (Quiet Luxury):**
- Card `bg-card/50 border-border/50 backdrop-blur-sm` com leve gradiente roxo no header.
- Header: ícone `Sparkles`, título "Configure sua agência em 5 passos", subtítulo `{doneCount} de 5 concluídos`.
- `<Progress value={doneCount * 20} className="h-1.5" />` — exatamente 20% por item.
- Chip âmbar countdown 24h (apenas se incompleto E `created_at + 24h > now`): `"23h 14m restantes para R$100 OFF"`.
- Lista 5 itens: ícone `CheckCircle2`/`Circle`, título, link `→` para rota (`/whatsapp`, `/clients`, `/crm`, `/tasks`, `/team`); item concluído = `line-through opacity-60` sem link.
- Footer:
  - Concluído + elegível: badge dourado `"🎉 Cupom de R$100 desbloqueado"` + botão `Ocultar`.
  - Concluído mas não-elegível: mensagem discreta + botão `Ocultar`.
  - Após 7 dias do `created_at`: botão `Ocultar` sempre disponível.

**Visibilidade (não renderiza se):**
- `agency.onboarding_widget_dismissed === true`, OU
- Todos completos E sem cupom E user clicou Ocultar.

**Botão Ocultar:** `UPDATE agencies SET onboarding_widget_dismissed = true`.

## 3. Integração `src/pages/Index.tsx`

Inserir `<OnboardingChecklist />` logo abaixo de `<MyDayHeader />` no mesmo `space-y-6`. Componente decide internamente se renderiza.

## 4. Edge Function `onboarding-checkout` (modificar)

Adicionar antes de `stripe.checkout.sessions.create`:

```ts
const { data: agencyFlags } = await supabaseClient
  .from('agencies')
  .select('onboarding_discount_eligible')
  .eq('id', agencyData.id)
  .single();

const couponId = Deno.env.get('STRIPE_FAST_TRACK_COUPON_ID');
const discounts = (agencyFlags?.onboarding_discount_eligible && couponId)
  ? [{ coupon: couponId }]
  : undefined;
```

Na chamada `create`:
```ts
const session = await stripe.checkout.sessions.create({
  // ...campos atuais...
  ...(discounts ? { discounts } : { allow_promotion_codes: true }),
  // (mutuamente exclusivos — Stripe rejeita ambos)
});
```

**NÃO** marcar `onboarding_discount_eligible: false` após criar a session. A flag fica `true` até o webhook do Stripe confirmar pagamento bem-sucedido (ou o admin manualmente). Cupom no Stripe deve ser configurado como **"once per customer"** para evitar reuso.

Aplicar mesma lógica em `create-checkout` quando `agencyId` estiver presente.

## 5. Remover `/welcome`

- Deletar `src/pages/Welcome.tsx`.
- `src/App.tsx`: remover import + `<Route path="/welcome" />`.
- Buscar `navigate('/welcome')` / `Link to="/welcome"` → trocar por `/dashboard`.

## 6. Não-mexer

- `MyDayHeader`, layout do Dashboard, `subscription_plans`.
- Trial, enforcement, `BlockedAccessScreen`.
- Webhooks Stripe (`stripe-webhook`), `check-subscription`.
- Tema/cores globais — só tokens existentes.

## Detalhes técnicos resumidos

- **Segurança 24h**: 100% server-side. Cliente devtools não consegue forjar elegibilidade — RPC valida `created_at` do banco e checa `is_agency_admin()`.
- **Idempotência**: RPC só atualiza se `onboarding_completed_at IS NULL`. Múltiplas chamadas concorrentes → só a primeira escreve.
- **Anti double-fire confetti**: `useRef` local + checagem da coluna do banco; reset apenas em caso de erro RPC.
- **Anti-abandono checkout**: flag persiste até webhook de pagamento confirmar; cupom Stripe configurado "once per customer" no painel.
- **Performance**: 5 counts paralelos head:true + 1 SELECT agency = ~6 round-trips, cache 30s.
- **Confetti lazy**: `~5kb` só baixado no momento do disparo.

## O que precisarei de você

1. Criar o cupom de R$100 no Stripe Dashboard (sugestão: `amount_off: 10000`, `currency: BRL`, `duration: once`, `max_redemptions_per_customer: 1`).
2. Adicionar o secret `STRIPE_FAST_TRACK_COUPON_ID` com o ID retornado (`coupon_xxx`).

A implementação prossegue assim que aprovar — vou pedir o secret no início via `add_secret`.

