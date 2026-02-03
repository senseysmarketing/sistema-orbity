

# Correção: Notificações de Reunião Duplicadas e Typo no Resumo Diário

## Problemas Identificados

### Problema 1: Typo "3 reuniãoões"

| Arquivo | Linha | Código Atual | Código Correto |
|---------|-------|--------------|----------------|
| `process-notifications/index.ts` | 1219 | `${meetingsCount} reunião${meetingsCount > 1 ? 'ões' : ''}` | `${meetingsCount} ${meetingsCount > 1 ? 'reuniões' : 'reunião'}` |

O template atual concatena "reunião" + "ões" = "reuniãoões" ❌

---

### Problema 2: Notificações de Reunião Duplicadas

Observação do screenshot: 3 notificações "Reunião em breve - Call Rápida" enviadas com 15 minutos de intervalo (12m, 27m, 42m atrás).

**Causa raiz:**
- Linha 716: `batchCheckNotifications(trackingRecords, 1)` usa intervalo de **1 hora** para deduplicação
- Como a janela de notificação começa 1 hora antes da reunião, o job pode enviar múltiplas vezes durante esse período
- O intervalo de 1 hora é **insuficiente** porque o cron roda a cada minuto e pode haver pequenas variações de timing

**Solução:** Aumentar o intervalo de deduplicação para **24 horas**, garantindo que cada reunião gere apenas 1 notificação por dia por usuário.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/process-notifications/index.ts` | Corrigir typo e aumentar intervalo de deduplicação |

---

## Implementação

### 1. Corrigir Typo (linha 1219)

De:
```typescript
parts.push(`${meetingsCount} reunião${meetingsCount > 1 ? 'ões' : ''}`);
```

Para:
```typescript
parts.push(`${meetingsCount} ${meetingsCount > 1 ? 'reuniões' : 'reunião'}`);
```

---

### 2. Aumentar Intervalo de Deduplicação de Reuniões (linha 716)

De:
```typescript
const recentlySent = await batchCheckNotifications(trackingRecords, 1);
```

Para:
```typescript
const recentlySent = await batchCheckNotifications(trackingRecords, 24);
```

Isso garante que uma reunião só gera **1 notificação por dia** para cada usuário, independente de quantas vezes o job rode.

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| "3 reuniãoões" | "3 reuniões" |
| Múltiplas notificações para mesma reunião | Apenas 1 notificação por reunião por dia |

---

## Detalhes Técnicos

A função `batchCheckNotifications(records, minIntervalHours)` verifica na tabela `notification_tracking` se já foi enviada uma notificação para aquela combinação `(entity_id, user_id)` nas últimas `minIntervalHours` horas.

Ao mudar de 1 para 24 horas:
- O sistema verifica se já enviou notificação para essa reunião+usuário nas últimas 24h
- Se já enviou, pula (não cria nova notificação)
- Como reuniões geralmente não duram mais de 24h, isso efetivamente limita a 1 notificação por reunião

