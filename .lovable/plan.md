## Adicionar campo "Nome da Campanha" em Logística de Voo

**Problema:** Sem nome informado, a SendPulse gera automaticamente nomes aleatórios como `Campaign_9415256_fX2D`.

### Mudanças

**1. `src/pages/EmailMarketing.tsx`**
- Adicionar `name: ""` ao state `campaign` (e ao reset após envio).
- Na seção "Logística de Voo" → "Informações Básicas", adicionar como **primeiro campo**, antes de "Remetente":
  - `Label`: "Nome da Campanha"
  - `Input` com placeholder: "Ex: Newsletter Maio 2026 - Promoções"
  - Texto auxiliar pequeno abaixo: "Identificação interna da campanha (não aparece para o destinatário)."
- Validação em `handleSendCampaign`: se `name.trim()` vazio → toast `"Informe o nome da campanha"`.
- Incluir `name: campaign.name.trim()` no body do `supabase.functions.invoke('sendpulse-api', { action: 'create_campaign', ... })`.
- Adicionar `!campaign.name?.trim()` ao `disabled` do botão de disparo.

**2. `supabase/functions/sendpulse-api/index.ts` (action `create_campaign`)**
- Aceitar `name` em `params` e repassar como propriedade `name` no body POST para `https://api.sendpulse.com/campaigns` (campo nativo da API SendPulse). Manter retrocompatibilidade: se ausente, não enviar.
- Adicionar `name?: string` na tipagem dos params.

### Fora de escopo
- Edição de nome de campanhas já existentes.
- Alterações em `CampaignBuilder`, métricas, ou listagem de campanhas (a coluna de listagem já mostrará automaticamente o nome retornado pela SendPulse).