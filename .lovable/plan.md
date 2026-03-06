

# Ajustes no Plano: Meta Conversions API

Três refinamentos técnicos no plano aprovado anteriormente.

## 1. `external_id` como array

No `sendMetaEvent`, garantir que `external_id` é array (como `em` e `ph` já são):

```typescript
userData.external_id = [await hashData(lead.id)];
```

A Meta espera arrays para todos os campos de `user_data`. O plano já previa isso corretamente — apenas confirmar que a implementação segue o padrão.

## 2. Adicionar `event_source_url`

Incluir `event_source_url` no payload do evento. Melhora match quality e atribuição:

```typescript
{
  event_name: eventName,
  event_time: Math.floor(Date.now() / 1000),
  event_id: eventId,
  action_source: 'system_generated',
  event_source_url: 'https://sistema-orbity.lovable.app',
  user_data: { ... },
  custom_data: { ... }
}
```

Valor fixo usando a URL pública do sistema. Arquivo afetado: `supabase/functions/process-lead-qualification/index.ts`.

## 3. Query única para pixel + token

Criar uma database function que retorna pixel e token numa só query, reduzindo latência:

```sql
CREATE OR REPLACE FUNCTION public.get_meta_pixel_config(p_agency_id uuid)
RETURNS TABLE(pixel_id text, test_event_code text, access_token text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.pixel_id, p.test_event_code, c.access_token
  FROM facebook_pixels p
  JOIN facebook_connections c ON p.agency_id = c.agency_id
  WHERE p.agency_id = p_agency_id
    AND p.is_selected = true
    AND c.is_active = true
  LIMIT 1;
$$;
```

Na edge function, substituir duas queries por uma:

```typescript
const { data: config } = await supabase.rpc('get_meta_pixel_config', { p_agency_id: agencyId });
if (!config?.length) { /* no pixel/token */ }
const { pixel_id, test_event_code, access_token } = config[0];
```

## Resumo de mudanças adicionais

| Arquivo | Mudança |
|---------|---------|
| Migration (nova) | Função `get_meta_pixel_config` |
| `process-lead-qualification/index.ts` | `event_source_url`, `external_id` como array, usar `rpc('get_meta_pixel_config')` |

Estes ajustes se somam ao plano principal já aprovado. Nenhuma mudança de arquitetura — apenas refinamentos no payload e otimização de query.

