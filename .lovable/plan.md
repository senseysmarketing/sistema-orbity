

# Trial Personalizado por Agência — Plano final aprovado com Fail-Safe

## Decisão arquitetural (mantida)

Reusar `agency_subscriptions.trial_end` como única fonte de verdade. Sem nova coluna, sem alteração no `PaymentMiddlewareWrapper`, `useAgency`, `check-subscription` ou view `master_agency_overview`.

## 1. `AgencyDetailsSheet.tsx` — nova seção "Gestão de Acesso e Trial"

Inserir entre o toggle "Acesso Ativo" e o histórico de pagamentos.

### Guardrail 1 — Blindagem por status (Fail-Safe)

Avaliar `agency.subscription_status` **antes** de renderizar o editor:

- **`active` ou `canceled`** → renderizar apenas:
  ```tsx
  <Alert variant="default">
    <AlertDescription>
      A agência já possui ou possuiu uma assinatura ({status}). A modificação 
      manual do período de trial não está disponível para este estado.
    </AlertDescription>
  </Alert>
  ```
  Nenhum DatePicker. Nenhum botão. Nenhuma mutação possível.

- **`trial`, `trial_expired`, `past_due`, ou subscription inexistente** → renderizar editor completo:
  - `Popover` + `Calendar` (shadcn DatePicker padrão, `pointer-events-auto`)
  - Estado inicial: `agency.trial_end` (se existir)
  - Legenda contextual:
    - `trial_end > now()` → "Trial ativo até dd/MM/yyyy ({n} dias restantes)" — texto azul
    - `trial_end <= now()` → "Trial expirado em dd/MM/yyyy" — texto vermelho
    - `null` → "Sem trial configurado"
  - Botões lado a lado:
    - **"Salvar nova data"** (primary) — habilitado só quando data foi alterada
    - **"Resetar para padrão (7 dias)"** (outline) — define `created_at + 7 dias`

### Guardrail 2 — Fim do dia (timezone-safe)

Ao salvar, normalizar a data selecionada para `23:59:59.999` antes de enviar:

```ts
import { endOfDay } from 'date-fns';

const finalDate = endOfDay(selectedDate); // 23:59:59.999 local
await supabase
  .from('agency_subscriptions')
  .update({ trial_end: finalDate.toISOString() })
  .eq('agency_id', agency.agency_id);
```

Cliente prometido até dia 05/05 mantém acesso até 05/05 23:59 e só vê `BlockedAccessScreen` na manhã de 06/05.

### Mutação

- **Update simples** quando já existe registro em `agency_subscriptions`:
  ```ts
  await supabase
    .from('agency_subscriptions')
    .update({ trial_end: endOfDay(date).toISOString(), status: 'trial' })
    .eq('agency_id', agency.agency_id);
  ```
  Status só vai para `'trial'` se atual for `trial`/`trial_expired`/`past_due`. Para os demais (já bloqueados pelo Guardrail 1), nem chegamos aqui.

- **Upsert com plano `orbity_trial`** (caso raro — sem registro):
  ```ts
  const { data: plan } = await supabase
    .from('subscription_plans').select('id')
    .eq('slug', 'orbity_trial').eq('is_active', true).single();
  
  await supabase.from('agency_subscriptions').insert({
    agency_id, plan_id: plan.id, status: 'trial',
    trial_start: new Date().toISOString(),
    trial_end: endOfDay(date).toISOString(),
    billing_cycle: 'monthly'
  });
  ```

- Toast de sucesso/erro + `refreshAgencies()` após salvar.

## 2. `AgenciesTable.tsx` — badge mais rica

Refinar o `getStatusBadge` apenas para o caso `trial`:

| Condição | Cor | Texto |
|---|---|---|
| `trial_end > now() + 48h` | azul | `Trial: expira em dd/MM` |
| `trial_end > now()` e `≤ 48h` | amarelo | `Trial: expira em dd/MM ⚠` |
| `trial_end <= now()` | vermelho | `Trial expirado em dd/MM` |

Sem nova coluna — tudo dentro do badge de Status existente (mantém densidade Quiet Luxury).

## 3. Avisos sutis ao owner

- **`BlockedAccessScreen.tsx`** (motivo `trial_expired`): linha discreta "Seu período de teste foi configurado pela equipe Orbity até dd/MM/yyyy" — exibida quando `Math.abs(trial_end - (created_at + 7d)) > 1 dia`.
- **`SubscriptionDetails.tsx`** (card de trial): nota "Período personalizado pela equipe Orbity" sob a mesma heurística.

## 4. Lógica de bloqueio — sem mudanças

`PaymentMiddlewareWrapper` já bloqueia via `subscription_status === 'trial' && trial_end <= now()`. Como editamos diretamente `trial_end`, o bloqueio passa a usar a data customizada automaticamente.

## Arquivos alterados

- `src/components/master/AgencyDetailsSheet.tsx` — nova seção com guardrail de status, DatePicker, `endOfDay`, 2 botões, mutação
- `src/components/master/AgenciesTable.tsx` — badge tricolor (azul/amarelo/vermelho)
- `src/components/payment/BlockedAccessScreen.tsx` — aviso "personalizado pela equipe"
- `src/components/subscription/SubscriptionDetails.tsx` — nota equivalente

## Sem mudanças

- Schema (`agency_subscriptions.trial_end` já existe)
- `PaymentMiddlewareWrapper`, `useAgency`, `useSubscription`, edge `check-subscription`
- View `master_agency_overview` (já expõe `trial_end` e `subscription_status`)
- RLS — Master já tem permissão via `is_master_agency_admin()`

## Resultado

Master abre a sheet de uma agência em trial → escolhe "05/05" → salva (gravado como `2025-05-05T23:59:59.999Z` local). Cliente usa o sistema sem bloqueio até a meia-noite do dia 06/05. Se a agência já estiver `active` ou `canceled`, o editor sequer aparece — apenas um aviso explicando o porquê.

