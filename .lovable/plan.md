

# Fix: Leads "won" com won_at NULL não contabilizados

## Diagnóstico

O lead **Diego Minichillo** tem `status = 'won'` mas `won_at = NULL`. O dashboard filtra vendas por `won_at` dentro do período selecionado (linha 111: `if (!wonAt) return false`), então leads sem `won_at` são silenciosamente ignorados.

O trigger `set_lead_won_at_trigger` existe e está ativo, mas por algum motivo não disparou para esse lead (possivelmente inserido já com status `won` em vez de atualizado para `won`, já que o trigger é `BEFORE UPDATE` apenas).

## Correções

### 1. Migration: Preencher won_at para leads órfãos
```sql
UPDATE leads 
SET won_at = COALESCE(status_changed_at, updated_at, NOW()) 
WHERE status = 'won' AND won_at IS NULL;
```

### 2. Migration: Adicionar trigger de INSERT
O trigger atual só cobre `BEFORE UPDATE`. Se um lead for inserido diretamente com `status = 'won'` (ex: via Manual), o `won_at` fica NULL. Adicionar cobertura para INSERT:
```sql
CREATE OR REPLACE FUNCTION set_lead_won_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'won' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'won') THEN
    NEW.won_at := NOW();
  ELSIF NEW.status != 'won' THEN
    NEW.won_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_lead_won_at_trigger ON leads;
CREATE TRIGGER set_lead_won_at_trigger
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_lead_won_at();
```

### 3. CRMDashboard.tsx: Fallback defensivo
Na linha 111, em vez de descartar leads com `won_at` NULL, usar fallback:
```ts
const wonAt = l.won_at ? new Date(l.won_at) : (l.status_changed_at ? new Date(l.status_changed_at) : null);
```
Isso garante que mesmo se o trigger falhar no futuro, o dashboard ainda contabiliza a venda.

## Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | Fix dados órfãos + trigger INSERT |
| `src/components/crm/CRMDashboard.tsx` | Fallback `won_at → status_changed_at` |

