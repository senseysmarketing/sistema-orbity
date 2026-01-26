
# Correção: Classificação de Resultados não sendo salva

## Problema Identificado

A "Classificação de Resultados" está sendo salva no banco de dados, mas não está sendo recuperada corretamente ao recarregar a página. O problema está relacionado à coluna `ad_account_id` na tabela `traffic_controls`.

### Causa Raiz

1. **Dados existentes com `ad_account_id` null**: A maioria dos registros na tabela `traffic_controls` tem a coluna `ad_account_id` como `null`. O ID da conta está armazenado apenas dentro do campo JSON `platform_data`.

2. **Busca ineficaz**: Quando o código tenta recuperar os controles, ele cria um mapa baseado em `c.ad_account_id`, mas como esse valor é `null`, o mapeamento falha.

3. **Registros duplicados potenciais**: Ao salvar, a busca por registro existente também usa a coluna `ad_account_id` (null), podendo criar registros duplicados.

## Solução

Corrigir a lógica de busca para considerar tanto a coluna `ad_account_id` quanto o valor dentro do `platform_data`, e garantir que novos registros salvem corretamente o `ad_account_id` na coluna dedicada.

## Alterações Técnicas

### Arquivo: `src/components/traffic/ClientsPanel.tsx`

**1. Corrigir `loadClientsFromCache` (linhas 279-286)**

Alterar a criação do `controlsMap` para usar o `ad_account_id` do `platform_data` como fallback:

```typescript
const controlsMap = new Map(
  controlsData?.map(c => [
    c.ad_account_id || (c.platform_data as any)?.ad_account_id, 
    c
  ]) || []
);
```

**2. Corrigir `refreshAllDataOnMount` (linhas 218-225)**

Aplicar a mesma correção:

```typescript
const controlsMap = new Map(
  controlsData?.map(c => [
    c.ad_account_id || (c.platform_data as any)?.ad_account_id,
    c
  ]) || []
);
```

**3. Corrigir `refreshAllData` (linhas 351-358)**

Aplicar a mesma correção:

```typescript
const controlsMap = new Map(
  controlsData?.map(c => [
    c.ad_account_id || (c.platform_data as any)?.ad_account_id,
    c
  ]) || []
);
```

**4. Corrigir `handleUpdateClient` (linhas 433-438)**

Alterar a busca por registro existente para considerar também o `platform_data`:

```typescript
// Buscar registro existente - considerar coluna OU platform_data
const { data: existingControls } = await supabase
  .from('traffic_controls')
  .select('id, ad_account_id, platform_data')
  .eq('agency_id', currentAgency.id);

const existingControl = existingControls?.find(c => 
  c.ad_account_id === updatedClient.ad_account_id || 
  (c.platform_data as any)?.ad_account_id === updatedClient.ad_account_id
);
```

**5. Garantir que o `ad_account_id` seja salvo na coluna**

No objeto `controlData`, já está definido `ad_account_id: updatedClient.ad_account_id`, o que é correto. Isso garantirá que novos registros tenham a coluna preenchida.

## Resultado Esperado

- A classificação de resultados será corretamente recuperada ao recarregar a página
- Novos registros terão a coluna `ad_account_id` preenchida corretamente
- Registros existentes continuarão funcionando via fallback do `platform_data`

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/components/traffic/ClientsPanel.tsx` | Corrigir lógica de mapeamento e busca de controles |
