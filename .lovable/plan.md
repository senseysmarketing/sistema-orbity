

# Corrigir Dados Pre-populados no Modal de Edicao de Lead

## Problemas Identificados

### 1. Campo "Origem" fica em branco
O Select de Origem tem apenas 9 opcoes fixas (manual, website, social_media, etc.), mas leads capturados pelo Facebook tem `source = "facebook_leads"` ou `"facebook_ads"` -- valores que nao existem nas opcoes do Select. Como o Radix Select nao encontra um item com esse value, fica em branco.

**Solucao**: Adicionar as opcoes `facebook_leads` (Facebook Leads) e `facebook_ads` (Facebook Ads) ao Select de Origem.

### 2. Campo "Etapa do Funil" fica em branco
O `useEffect` que popula o formulario depende apenas de `[lead]`, mas as funcoes de mapeamento de status (`getStatusKey`, `mapDatabaseStatusToDisplay`) dependem do array `statuses` que carrega de forma assincrona do Supabase. Quando o efeito roda antes dos statuses carregarem, o mapeamento falha e o valor fica vazio. Alem disso, status customizados como "Desqualificados" passam por uma cadeia de normalizacao que pode nao resolver corretamente.

**Solucao**: Adicionar `statuses` e `statusesLoading` as dependencias do `useEffect`, para que o formulario seja re-populado quando os status terminarem de carregar.

## Alteracoes

### Arquivo: `src/components/crm/LeadForm.tsx`

**1. Adicionar opcoes de Facebook ao Select de Origem**

Adicionar dois novos `SelectItem`:
- `facebook_leads` -> "Facebook Leads"
- `facebook_ads` -> "Facebook Ads"

**2. Corrigir dependencias do useEffect**

Mudar de `[lead]` para `[lead, statuses]`, garantindo que quando os statuses carregarem, o formulario re-popula com o valor correto.

**3. Melhorar logica de mapeamento de status para edicao**

Tornar o mapeamento mais robusto: se o status do lead ja corresponde diretamente a um `statusKey` existente (comparacao direta com `getStatusKey(status.name)`), usar esse valor. Caso contrario, passar pela cadeia de normalizacao. Isso cobre tanto status canonicos quanto customizados.

