

# Link Mágico de Relatório Público (Revisado com Segurança)

## Resumo
Relatório público compartilhável via token seguro com expiração de 48h. Edge Function dedicada para contornar RLS com segurança. Página dark mode premium com framer-motion.

---

## Migration SQL

```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS report_token TEXT,
  ADD COLUMN IF NOT EXISTS report_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_report_token
  ON public.clients(report_token) WHERE report_token IS NOT NULL;
```

Nenhuma policy `anon` na tabela `clients`. O acesso público é feito exclusivamente via Edge Function com Service Role.

---

## Nova Edge Function: `public-client-report`

**Arquivo:** `supabase/functions/public-client-report/index.ts`

- Recebe `POST { token: string }`
- Usa `supabaseAdmin` (Service Role Key) para buscar cliente onde `report_token = token`
- Valida expiração: se `report_expires_at < now()` ou não encontrado, retorna `403 { error: "expired" }`
- Se válido:
  1. Busca dados básicos do cliente (nome, empresa)
  2. Busca `ad_accounts` vinculadas ao cliente via `client_id`
  3. Para cada ad account com `access_token` ativo, chama a API da Meta para obter métricas (spend, conversions, campaigns)
  4. Se não houver conexão Meta, retorna dados mockados com flag `is_mock: true`
  5. Retorna payload: `{ client_name, company, metrics: { spend, conversions, cpa, active_campaigns }, top_campaigns: [...], is_mock }`
- CORS headers incluídos em todas as respostas
- `verify_jwt = false` no `config.toml`

---

## Novos Arquivos

### 1. `src/pages/PublicClientReport.tsx`

- Extrai `:token` via `useParams()`
- Faz `POST` para Edge Function `public-client-report` com `{ token }`
- **3 estados de renderização:**
  - **Loading**: tela dark com skeleton animado
  - **Expirado/Erro** (status 403): tela dark minimalista com ícone `<Clock>` laranja, "Link Expirado", subtítulo orientando solicitar novo acesso
  - **Dashboard**: página dark mode premium com:
    - Fundo escuro com gradiente radial sutil (tons azul/roxo)
    - Header com slide-down: logo, nome do cliente, "Relatório de Performance", badge "Ao Vivo" piscando verde
    - Grid 2x2 de métricas (glassmorphism `bg-white/5 backdrop-blur-md border-white/10`): Investimento, Conversões, Custo/Conversão, Campanhas Ativas
    - `staggerChildren` fade-up com framer-motion
    - Animação count-up nos números
    - Top 3 campanhas com barras `<Progress>`
    - Rodapé "Gerado por Sensey's"
- Todas as animações via `framer-motion` (já instalado)
- Mobile-first, sem scroll horizontal

### 2. Rota em `src/App.tsx`

```tsx
<Route path="/report/:token" element={<PublicClientReport />} />
```

Adicionada nas rotas públicas (fora do escopo de autenticação).

---

## Arquivos Modificados

### 3. `src/components/traffic/CampaignsAndReports.tsx`

- **Botão "Compartilhar"**: `<Button variant="outline" size="sm">` com ícone `<Share2>`, ao lado do botão "Atualizar"
- **Estado `isGeneratingLink`**: boolean que controla spinner/loading no botão e desabilita cliques duplos
- **Validação de contexto**: se `clientId` não estiver disponível (nenhuma conta/cliente selecionado), exibe `toast.error("Selecione uma conta antes de compartilhar")`
- **Lógica onClick**:
  1. Seta `isGeneratingLink = true`
  2. Gera token: `crypto.randomUUID()`
  3. Calcula expiração: `new Date(Date.now() + 48 * 60 * 60 * 1000)`
  4. Faz `update` no Supabase: `clients.update({ report_token, report_expires_at }).eq('id', clientId)`
  5. Se erro no update: `toast.error("Erro ao gerar link")` e retorna
  6. Monta URL: `window.location.origin + '/report/' + token`
  7. Copia para clipboard
  8. `toast.success("Link seguro gerado! Válido por 48 horas.")`
  9. Seta `isGeneratingLink = false` no `finally`

### 4. `supabase/config.toml`

Adicionar entrada para a nova Edge Function:
```toml
[functions.public-client-report]
verify_jwt = false
```

---

## Segurança

- Nenhuma policy `anon` em tabelas sensíveis
- Todo acesso público passa pela Edge Function com Service Role
- Token UUID não expõe IDs internos
- Expiração de 48h validada server-side
- Index no banco para busca rápida por token

## Arquivos totais (3 novos + 2 modificados)
- Edge Function `supabase/functions/public-client-report/index.ts` (novo)
- `src/pages/PublicClientReport.tsx` (novo)
- `src/App.tsx`
- `src/components/traffic/CampaignsAndReports.tsx`
- `supabase/config.toml`
- Migration SQL

