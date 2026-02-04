

# Adicionar Campo `won_at` na Tabela Leads

## Objetivo

Criar um campo dedicado `won_at` na tabela `leads` para registrar a data/hora exata em que uma venda foi fechada, com atualização automática via trigger quando o status mudar para "won".

---

## Problema Resolvido

| Situação | Antes | Depois |
|----------|-------|--------|
| Lead criado em Janeiro, fechado em Fevereiro | Aparece nos relatórios de Janeiro | Aparece nos relatórios de Fevereiro |
| Data de fechamento da venda | Aproximada (`updated_at`) | Precisa (`won_at`) |
| Relatórios de receita | Por data de criação do lead | Por data de fechamento da venda |

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| Nova migration SQL | Adicionar coluna `won_at` e trigger automático |
| `src/components/crm/CRMDashboard.tsx` | Usar `won_at` para filtrar receita |
| `src/components/crm/CRMInvestmentMetrics.tsx` | Usar `won_at` para métricas de vendas |
| `src/components/crm/CRMFunnelChart.tsx` | Considerar `won_at` para vendas no funil |

---

## Implementação

### 1. Migration SQL

```sql
-- Adicionar coluna won_at
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS won_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar índice para consultas por período de vendas
CREATE INDEX IF NOT EXISTS idx_leads_won_at 
ON public.leads (won_at) 
WHERE won_at IS NOT NULL;

-- Trigger para atualizar won_at automaticamente
CREATE OR REPLACE FUNCTION public.set_lead_won_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Se status mudou para 'won' e won_at ainda não está definido
  IF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' THEN
    NEW.won_at := NOW();
  END IF;
  
  -- Se status saiu de 'won', limpar won_at
  IF OLD.status = 'won' AND NEW.status IS DISTINCT FROM 'won' THEN
    NEW.won_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS set_lead_won_at_trigger ON public.leads;
CREATE TRIGGER set_lead_won_at_trigger
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_lead_won_at();

-- Retroativamente preencher won_at para leads já ganhos (usando updated_at como aproximação)
UPDATE public.leads 
SET won_at = updated_at 
WHERE status = 'won' AND won_at IS NULL;
```

### 2. Alterar Filtro no Dashboard

No `CRMDashboard.tsx`, separar a lógica:
- **Total de leads**: filtrar por `created_at` (entrada no funil)
- **Receita/vendas**: filtrar por `won_at` (fechamento)

```typescript
const metrics = useMemo(() => {
  // Leads filtrados por data de criação (entrada no funil)
  const filteredLeads = leads.filter(lead => {
    const createdAt = new Date(lead.created_at);
    return createdAt >= dateRange.from && createdAt <= dateRange.to;
  });

  const totalLeads = filteredLeads.length;

  // Vendas filtradas por data de FECHAMENTO (won_at)
  const wonLeads = leads.filter(l => {
    if (normalizeLeadStatusToDb(l.status) !== 'won') return false;
    const wonAt = l.won_at ? new Date(l.won_at) : null;
    if (!wonAt) return false;
    return wonAt >= dateRange.from && wonAt <= dateRange.to;
  });

  const wonCount = wonLeads.length;
  const revenue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0);
  
  // Taxa de conversão considerando leads criados no período
  const conversionRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;
  // ...
}, [leads, dateRange]);
```

### 3. Atualizar Interface Lead

Adicionar `won_at` ao tipo Lead usado nos componentes:

```typescript
interface Lead {
  // ... campos existentes
  won_at?: string | null;
}
```

### 4. Atualizar CRMInvestmentMetrics

Mesma lógica: usar `won_at` para filtrar vendas em vez de `created_at`:

```typescript
const wonLeads = filteredLeads.filter(l => {
  if (l.status !== 'won') return false;
  const wonAt = l.won_at ? new Date(l.won_at) : null;
  if (!wonAt) return false;
  return wonAt >= dateRange.from && wonAt <= dateRange.to;
});
```

---

## Fluxo do Sistema

```text
Lead criado (Janeiro)
    │
    ├── created_at = 2026-01-15
    │
    └── status = 'leads' → won_at = NULL
          │
          ▼
Lead passa por estágios
    │
    └── status = 'proposal' → won_at = NULL (ainda)
          │
          ▼
Venda fechada (Fevereiro)
    │
    ├── status = 'won'
    │
    └── TRIGGER → won_at = 2026-02-04 ✓
          │
          ▼
Dashboard Fevereiro
    │
    ├── Total leads: filtra por created_at
    │
    └── Receita: filtra por won_at → Lead aparece! ✓
```

---

## Comportamento do Trigger

| Ação | won_at |
|------|--------|
| Lead muda para `won` | Preenchido com timestamp atual |
| Lead sai de `won` (ex: volta para `proposal`) | Limpo para NULL |
| Lead já era `won` e permanece `won` | Mantém valor original |
| Novo lead criado como `won` (direto) | Preenchido no INSERT |

---

## Métricas Afetadas

| Métrica | Filtro Usado |
|---------|--------------|
| Total de Leads | `created_at` |
| Leads por Estágio | `created_at` |
| **Receita Confirmada** | `won_at` |
| **Taxa de Conversão** | `created_at` (entrada) vs `won_at` (saída) |
| **ROAS** | `won_at` (receita do período) |
| **Ticket Médio** | `won_at` |
| **CPA** | `won_at` |

---

## Resultado Visual no Dashboard

Cenário: Lead "Empresa X" criado em Janeiro, fechado em Fevereiro

**Dashboard Janeiro:**
- Total Leads: 1 (criado neste mês)
- Receita: R$ 0 (não foi fechado neste mês)

**Dashboard Fevereiro:**
- Total Leads: 0 (não foi criado neste mês)
- Receita: R$ 5.000 (fechado neste mês) ✓

