

# Disparar automação WhatsApp para os 7 leads recentes

## Situação atual
- 7 leads capturados entre 07/03 e 09/03 (Wellington Santos → Paulo Nascimento)
- Conta WhatsApp conectada: `de9c5180-369e-4287-922b-821a197fd367` (Senseys)
- Template de saudação configurado com delay de 5 minutos
- Nenhuma conversa ou registro de automação existe para esses leads
- O cron job `process-whatsapp-queue` já foi criado na migração anterior

## Plano

Criar uma **migração SQL** que:

1. **Insira 7 conversas** na tabela `whatsapp_conversations` (uma por lead)
2. **Insira 7 registros de automação** na tabela `whatsapp_automation_control` com:
   - `status = 'active'`
   - `current_phase = 'greeting'`
   - `current_step_position = 1`
   - `next_execution_at = NOW()` (para serem processados imediatamente pelo cron)
   - `conversation_state = 'new_lead'`

Os 7 leads:

| Nome | Telefone | Lead ID |
|------|----------|---------|
| Wellington Santos | +5513996317120 | c546a4f1-... |
| Diego Silva | +5551998778423 | 13050b67-... |
| Andre Fernandes | +5521981566001 | c2904576-... |
| Roberto Seguro | +5513988149272 | 295bb68e-... |
| Grupo Palomo | +5515997644369 | 8ddaaf76-... |
| Anderson Rentes | +5519991946424 | cb9b08fb-... |
| Paulo Nascimento | +5514991227150 | cfee87ba-... |

O cron job que roda a cada minuto vai detectar esses registros com `next_execution_at <= NOW()` e disparar as mensagens respeitando o horário permitido (seg-sex 08h-18h).

### Arquivo
| Arquivo | Ação |
|---------|------|
| `supabase/migrations/[timestamp].sql` | Inserir conversas + registros de automação |

