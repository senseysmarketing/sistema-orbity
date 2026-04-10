

# Conversões Dinâmicas — Seletor de Métrica de Conversão

## Problema
As Edge Functions hardcodam 3 action_types como "conversão" (`purchase`, `lead`, `complete_registration`). Campanhas de mensagem no WhatsApp usam action_types diferentes (ex: `onsite_conversion.messaging_conversation_started_7d`), resultando em conversões zeradas.

## Solução
1. Retornar **todas** as actions da Meta API para o frontend
2. Adicionar um seletor no card de Conversões para escolher qual action_type exibir
3. Propagar a escolha para tabela de campanhas, relatórios e snapshot do link compartilhável

## Alterações

### 1. Edge Functions — Retornar actions brutas

**`supabase/functions/facebook-campaigns/index.ts`**
- Além do campo `conversions` (padrão), incluir `actions: insights.actions || []` no retorno de cada campanha
- Permite que o frontend recalcule conversões com base na action_type selecionada

**`supabase/functions/facebook-sync/index.ts`**
- Na ação `get_metrics`: retornar `allActions` — um mapa agregado de todas action_types com seus totais
- No `chartData` diário: incluir `actions` brutas por dia para recalcular por tipo
- Manter o campo `conversions` padrão como fallback

### 2. Frontend — `CampaignsAndReports.tsx`

**Novo estado:**
- `availableActions: {action_type: string, value: number}[]` — lista de todos os tipos disponíveis
- `selectedActionType: string` — tipo selecionado (default: auto-detect baseado no objetivo das campanhas)

**Lógica de auto-detecção:**
- Se maioria das campanhas tem objetivo `OUTCOME_LEADS` → default `lead`
- Se objetivo `OUTCOME_ENGAGEMENT` ou `MESSAGES` → default `onsite_conversion.messaging_conversation_started_7d`
- Fallback: `lead`

**Card de Conversões atualizado:**
- Adicionar um pequeno botão/ícone (Settings/ChevronDown) ao lado do título "Conversões"
- Ao clicar, abre um Popover/DropdownMenu listando os action_types disponíveis com seus nomes traduzidos e totais
- O título do card muda para refletir a seleção: "Leads", "Mensagens", "Compras", etc.

**Recálculo dinâmico:**
- `metrics.conversions` recalculado filtrando `allActions` pelo `selectedActionType`
- Cada campanha na tabela recalcula suas conversões via `campaign.actions`
- `chartData` recalcula conversões diárias via actions brutas

**Mapa de tradução dos action_types mais comuns:**
```text
lead                          → Leads
purchase                      → Compras
complete_registration         → Cadastros
onsite_conversion.messaging_* → Conversas Iniciadas
link_click                    → Cliques no Link
landing_page_view             → Visualizações da Página
offsite_conversion.*          → Conversões Offsite
```

### 3. Tabela de Campanhas Ativas
- A coluna "Conversões" usa o `selectedActionType` para recalcular por campanha
- Header da coluna mostra o nome traduzido do tipo selecionado

### 4. Snapshot e Relatório Compartilhável
- Ao salvar o snapshot, incluir `selectedActionType` e `actionTypeLabel`
- O `PublicClientReport.tsx` exibe o label correto (ex: "Leads" em vez de "Conversões")

### 5. ReportGeneratorModal
- O template de relatório usa o label dinâmico da conversão selecionada

## Arquivos modificados (5 + 2 edge functions)
- `supabase/functions/facebook-campaigns/index.ts`
- `supabase/functions/facebook-sync/index.ts`
- `src/components/traffic/CampaignsAndReports.tsx`
- `src/components/traffic/ReportGeneratorModal.tsx`
- `src/pages/PublicClientReport.tsx`

