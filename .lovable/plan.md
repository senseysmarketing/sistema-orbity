

# Correção: Resumo Diário Não Sendo Enviado

## Problema Identificado

Após análise completa dos logs e banco de dados, identifiquei que o **Resumo Diário não está sendo enviado desde 27 de Janeiro** por causa de um erro no sistema de lock.

### Causa Raiz

O campo `entity_id` na tabela `notification_tracking` é do tipo **UUID**, mas o código do lock tenta inserir uma **string**:

```typescript
// Código problemático
const lockKey = `${lockName}_${new Date().toISOString().split('T')[0]}`;
// Resulta em: "process_notifications_2026-01-29" (não é um UUID!)

await supabase.from('notification_tracking').upsert({
  entity_id: lockKey,  // ❌ String inválida para campo UUID
  // ...
});
```

### Erro nos Logs

```
ERROR: invalid input syntax for type uuid: "process_notifications_2026-01-29"
```

Quando o upsert falha, a função `acquireProcessLock` retorna `false`, e a lógica interpreta isso como "outro processo está rodando" - **bloqueando todos os envios subsequentes**.

---

## Solução

### Parte 1: Corrigir o Sistema de Lock

O lock precisa usar UUIDs válidos ou uma abordagem diferente:

**Opção A - Usar UUID v5 determinístico (recomendada):**
```typescript
import { v5 as uuidv5 } from 'uuid';

const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace

async function acquireProcessLock(lockName: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const lockKey = uuidv5(`${lockName}_${today}`, NAMESPACE);
  // Agora lockKey é um UUID válido
  // ...
}
```

**Opção B - Usar tabela separada para locks:**
Criar uma tabela específica com campo `lock_name TEXT` ao invés de usar `notification_tracking`.

### Parte 2: Melhorar Tratamento de Erros

Quando o lock falha por erro de banco, NÃO considerar como "outro processo rodando", e sim permitir a execução:

```typescript
async function acquireProcessLock(lockName: string): Promise<boolean> {
  // ... código do lock ...
  
  const { error } = await supabase.from('notification_tracking').upsert({...});

  if (error) {
    // Se for erro de formato, não bloquear - permitir execução
    if (error.code === '22P02') {
      console.warn(`Lock format error for '${lockName}', proceeding anyway`);
      return true; // Permite a execução
    }
    console.error(`Error acquiring lock '${lockName}':`, error);
    return true; // Em caso de erro, melhor tentar do que bloquear
  }
  // ...
}
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/process-notifications/index.ts` | Corrigir sistema de lock para usar UUID válido e melhorar tratamento de erros |

---

## Implementação

Vou modificar a função `acquireProcessLock` para:

1. Gerar um UUID determinístico baseado no nome do lock + data usando SHA-1 hash convertido para formato UUID
2. Quando há erro no banco, permitir a execução ao invés de bloquear
3. Adicionar logs mais detalhados para debugging

```typescript
// Gerar UUID v5 determinístico a partir de uma string
function stringToUUID(str: string): string {
  // Simple hash-based UUID generation (UUID v5-like)
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  const hex = Math.abs(hash).toString(16).padStart(12, '0');
  // Format as UUID (version 4 format but deterministic)
  return `00000000-0000-4000-8000-${hex.slice(-12)}`;
}

async function acquireProcessLock(lockName: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const lockKey = stringToUUID(`${lockName}_${today}`);
  
  console.log(`🔐 Attempting to acquire lock '${lockName}' with key ${lockKey}`);
  
  // ... rest of the lock logic with improved error handling
}
```

---

## Benefícios

1. **Resumos diários funcionarão novamente** - Lock não bloqueará mais por erro de formato
2. **Locks válidos no banco** - UUIDs determinísticos por dia
3. **Resiliência** - Erros de lock não impedem processamento
4. **Debugging melhorado** - Logs mais claros

---

## Após Implementação

Depois de fazer o deploy, será necessário:
1. Aguardar o próximo cron job às 8h (11h UTC)
2. Ou testar manualmente chamando a edge function

