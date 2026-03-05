

# Horários e Dias Permitidos para Envio de WhatsApp

## O que será feito

Adicionar configuração de **janela de envio** (dias da semana e horários permitidos) na aba WhatsApp do CRM Settings. Se uma mensagem cair fora da janela, o `next_execution_at` será ajustado para o próximo horário permitido. Mensagens subsequentes se baseiam no horário real de envio.

## Alterações

### 1. Migração SQL

Adicionar coluna `sending_schedule` (JSONB) na tabela `whatsapp_accounts`:

```json
{
  "enabled": true,
  "start_hour": 8,
  "end_hour": 18,
  "allowed_days": [1, 2, 3, 4, 5]  // 0=Dom, 1=Seg...6=Sab
}
```

Default: `{"enabled": false, "start_hour": 8, "end_hour": 18, "allowed_days": [1,2,3,4,5]}`

### 2. `WhatsAppTemplateManager.tsx`

Adicionar seção **"Horários de Envio"** acima dos templates:
- Toggle para ativar/desativar restrição de horário
- Seletores de hora início e fim (ex: 08:00 - 18:00)
- Checkboxes para dias da semana (Seg-Dom)
- Texto explicativo: "Mensagens fora do horário serão enviadas no próximo horário permitido"
- Salva no campo `sending_schedule` da `whatsapp_accounts`

### 3. `process-whatsapp-queue/index.ts`

Antes de enviar, verificar se o horário atual (em `America/Sao_Paulo`) está dentro da janela configurada:
- Buscar `sending_schedule` do `whatsapp_accounts` (já vem no join)
- Se `enabled` e fora da janela → recalcular `next_execution_at` para o próximo horário permitido e devolver status para `active`
- Ao calcular `nextExecution` para o próximo step, também aplicar a mesma lógica de ajuste

Função auxiliar `getNextAllowedTime(schedule, baseTime)`:
- Se `baseTime` está dentro da janela → retorna `baseTime`
- Se `baseTime` é após `end_hour` no mesmo dia → avança para `start_hour` do próximo dia permitido
- Se `baseTime` é antes de `start_hour` → ajusta para `start_hour` do mesmo dia (se dia permitido)
- Se dia não é permitido → avança para próximo dia permitido no `start_hour`

### 4. Tipos Supabase

Atualizar `types.ts` para incluir `sending_schedule` em `whatsapp_accounts`.

## Arquivos

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | Adicionar coluna `sending_schedule` |
| `src/components/crm/WhatsAppTemplateManager.tsx` | Seção de horários de envio |
| `supabase/functions/process-whatsapp-queue/index.ts` | Lógica de ajuste de horário |
| `src/integrations/supabase/types.ts` | Atualizar tipo |

