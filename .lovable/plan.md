

# Módulo NPS Completo — Implementação com 4 Guardrails

## Migrações de Banco de Dados

### Migration 1: Tabelas `nps_tokens` e `nps_settings` + alterações em `nps_responses`

```sql
-- 1. Adicionar client_id à nps_responses (nullable para retrocompatibilidade)
ALTER TABLE public.nps_responses 
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;
-- period_id já existe mas é NOT NULL e referencia bonus_periods.
-- Adicionar coluna period text para ciclo NPS (ex: 'Q1-2026')
ALTER TABLE public.nps_responses 
  ADD COLUMN IF NOT EXISTS period text;
-- Tornar period_id nullable para respostas via Magic Link
ALTER TABLE public.nps_responses ALTER COLUMN period_id DROP NOT NULL;

-- 2. Tabela nps_tokens com coluna period
CREATE TABLE public.nps_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nps_tokens ENABLE ROW LEVEL SECURITY;

-- RLS: Members view
CREATE POLICY "Members view tokens" ON public.nps_tokens 
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));
-- RLS: Admins insert
CREATE POLICY "Admins insert tokens" ON public.nps_tokens 
  FOR INSERT WITH CHECK (public.is_agency_admin(agency_id));
-- RLS: Public read token by ID (para formulário público)
CREATE POLICY "Public read any token" ON public.nps_tokens 
  FOR SELECT TO anon USING (true);
-- GUARDRAIL 1: Public UPDATE para invalidar token após uso
CREATE POLICY "Public update token" ON public.nps_tokens 
  FOR UPDATE USING (is_used = false) WITH CHECK (is_used = true);

-- 3. Tabela nps_settings
CREATE TABLE public.nps_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE UNIQUE,
  frequency text NOT NULL DEFAULT 'quarterly',
  auto_send boolean NOT NULL DEFAULT false,
  whatsapp_instance_id uuid REFERENCES public.whatsapp_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nps_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view nps settings" ON public.nps_settings 
  FOR SELECT USING (public.user_belongs_to_agency(agency_id));
CREATE POLICY "Admins manage nps settings" ON public.nps_settings 
  FOR ALL USING (public.is_agency_admin(agency_id));

-- 4. Policy para INSERT público em nps_responses (via token válido)
CREATE POLICY "Public insert nps via token" ON public.nps_responses 
  FOR INSERT TO anon WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nps_tokens t 
      WHERE t.client_id = nps_responses.client_id 
      AND t.is_used = false 
      AND t.expires_at > now()
    )
  );
-- Policy para SELECT público limitado (apenas por client_id do token)
CREATE POLICY "Public read own nps" ON public.nps_responses 
  FOR SELECT TO anon USING (
    EXISTS (
      SELECT 1 FROM public.nps_tokens t 
      WHERE t.client_id = nps_responses.client_id
    )
  );
```

---

## Ficheiros Criados

### `src/pages/NPSPage.tsx` — Dashboard de Gestão NPS

- **Dashboard**: NPS Geral (% promotores - % detratores), cards de distribuição (Promotores/Neutros/Detratores), gráfico de barras coloridas
- **Lista de clientes**: Status da última pesquisa por cliente (Respondeu / Pendente / Não enviado)
- **Configurações de Ciclo**: Seletor de frequência (Trimestral padrão, Mensal, Semestral), salva em `nps_settings`
- **WhatsApp Config**: Toggle "Envio Automático", seletor de instância mostrando `instance_name` e `phone_number` reais (GUARDRAIL 4)
- **Botão "Enviar Pesquisa Agora"**: Gera tokens com `period` correcto (ex: Q2-2026) e envia via `supabase.functions.invoke('whatsapp-send')`

### `src/pages/PublicNPSSurvey.tsx` — Formulário Público

- Rota pública `/nps-survey?t=UUID`
- Valida token (exists, not used, not expired), faz join com `clients(name)` e `agencies(name)`
- Régua 0-10 com botões coloridos (0-6 vermelho, 7-8 amarelo, 9-10 verde)
- **GUARDRAIL 2 — Feedback dinâmico**:
  - Nota null → campo oculto
  - ≥ 9: "Ficamos muito felizes! O que mais gostou?"
  - 7-8: "Obrigado! O que faltou para a nota ser 10?"
  - ≤ 6: Borda/fundo avermelhado + "Sentimos muito por isso. O que podemos fazer IMEDIATAMENTE para resolver o seu problema?"
- Guia rápido visual explicando cada faixa
- **GUARDRAIL 3 — Submissão inteligente**:
  - INSERT em `nps_responses` com `client_id`, `client_name`, `score`, `category`, `comment`, `period` (do token), `agency_id`, `period_id` = null
  - UPDATE `nps_tokens` SET `is_used = true`
  - Se score ≤ 6: INSERT em `notifications` para todos os admins da agência: "🚨 Alerta de Churn: Cliente [Nome] deu nota [Nota] no NPS."
  - Tela de agradecimento

---

## Ficheiros Alterados

### `src/components/layout/AppSidebar.tsx`
- Importar `MessageSquareHeart` do lucide-react
- Adicionar item "NPS" na categoria "Administração" **antes** de "Metas & Bônus":
```typescript
{ title: "NPS", url: "/dashboard/nps", icon: MessageSquareHeart }
```

### `src/App.tsx`
- Importar `NPSPage` e `PublicNPSSurvey`
- Rota protegida: `<Route path="nps" element={<NPSPage />} />`
- Rota pública: `<Route path="/nps-survey" element={<PublicNPSSurvey />} />`

### `src/components/clients/ClientHealthScore.tsx`
- Alterar penalidade NPS Detrator de -30 para **-50 pontos**:
```typescript
else if (npsScore <= 6) score -= 50;
```

### `src/pages/ClientDetail.tsx`
- Na query NPS, buscar também por `client_id` (não apenas `client_name`)
- Priorizar match por `client_id`, fallback por `client_name`

---

## Resumo dos 4 Guardrails

| # | Guardrail | Implementação |
|---|-----------|---------------|
| 1 | RLS UPDATE para tokens | Policy `FOR UPDATE USING (is_used = false) WITH CHECK (is_used = true)` |
| 2 | Feedback dinâmico | Campo de texto reage à nota com cor e texto contextual |
| 3 | Period no submit + alerta churn | Grava `period` do token + INSERT em `notifications` se ≤ 6 |
| 4 | Nome real da instância WhatsApp | Exibe `instance_name` e `phone_number` de `whatsapp_accounts` |

