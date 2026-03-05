

# Layout Side-by-Side: Horários de Envio + Origens Permitidas

## O que será feito

Reorganizar a seção acima dos templates em dois blocos lado a lado:
- **Esquerda**: Horários de Envio (componente existente)
- **Direita**: Novo bloco "Origens Permitidas" — checkboxes para selecionar quais origens de lead disparam a automação WhatsApp

As origens disponíveis (baseadas no `LeadForm.tsx`): Manual, Website, Redes Sociais, Email, Telefone, Indicação, Evento, Anúncio, Facebook Leads, Facebook Ads, Outro.

A configuração de origens será salva como JSONB na `whatsapp_accounts` (nova coluna `allowed_sources`).

## Alterações

### 1. Migração SQL
Adicionar coluna `allowed_sources jsonb default '[]'` na tabela `whatsapp_accounts`.

### 2. Novo componente `AllowedSourcesManager.tsx`
- Card com checkboxes para cada origem de lead
- Toggle "Todas as origens" para selecionar/desselecionar todas
- Salva no campo `allowed_sources` da `whatsapp_accounts`
- Mesma estrutura visual do `SendingScheduleManager`

### 3. `WhatsAppTemplateManager.tsx`
Substituir `<SendingScheduleManager />` por um grid de 2 colunas:
```
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <SendingScheduleManager />
  <AllowedSourcesManager />
</div>
```

### 4. `process-whatsapp-queue/index.ts`
Antes de enviar, verificar se a origem do lead está na lista `allowed_sources`. Se a lista estiver vazia, permite todas (backward compatible).

### 5. Tipos Supabase
Atualizar `types.ts` para incluir `allowed_sources`.

## Arquivos

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | Adicionar coluna `allowed_sources` |
| `src/components/crm/AllowedSourcesManager.tsx` | Criar |
| `src/components/crm/WhatsAppTemplateManager.tsx` | Grid layout |
| `supabase/functions/process-whatsapp-queue/index.ts` | Filtro por origem |
| `src/integrations/supabase/types.ts` | Atualizar tipo |

