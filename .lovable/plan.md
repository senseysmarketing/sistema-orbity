

# Gerenciamento de Carteira + Churn no ClientProfitabilityCard

## O que muda

1. **`ClientProfitabilityCard.tsx`** — Adicionar resumo de clientes ativos/churn no header + botao "Gerenciar Carteira"
2. **`ClientManagementSheet.tsx`** (novo) — Sheet lateral com ChurnAnalysis + lista de clientes com Switch ativar/desativar e AlertDialog de confirmacao
3. **`Admin.tsx`** — State de abertura + wiring das props

## Detalhes Tecnicos

### 1. `ClientProfitabilityCard.tsx`
- Novas props: `allClients: Client[]`, `selectedMonth: string`, `onOpenManagement: () => void`
- Calcular no componente: contagem de ativos no mes, MRR perdido (clientes com `cancelled_at` no mes selecionado)
- Header: linha "X Ativos | Churn: R$ Y" + botao "Gerenciar Carteira" (variant="outline", size="sm")

### 2. `ClientManagementSheet.tsx` (novo arquivo em `CommandCenter/`)
- Props: `open`, `onOpenChange`, `clients: Client[]`, `selectedMonth: string`, `agencyId: string`
- Sheet `side="right"`, `sm:max-w-[600px]`

**Secao Churn**: Renderiza `<ChurnAnalysis>` dentro de um `Collapsible` (default aberto)

**Secao Lista de Clientes**:
- Tabs "Todos | Ativos | Inativos" para filtrar
- Cada item: avatar (iniciais), nome, `formatCurrency(monthly_value)`, Switch
- **Trava de seguranca — AlertDialog na desativacao**:
  - Ao clicar Switch para OFF: intercepta e abre AlertDialog com mensagem "Tem certeza que deseja inativar este cliente? Ele sera removido do seu MRR atual e as futuras cobrancas automaticas serao suspensas."
  - Confirmar: executa `supabase.from('clients').update({ active: false, cancelled_at: now })` 
  - Reativar (Switch para ON): executa direto sem confirmacao (`active: true, cancelled_at: null`)
- **Invalidation completa**: apos mutacao, invalidar TODAS as query keys financeiras:
  - `['admin-clients', agencyId]`
  - `['admin-payments-all', agencyId]`
  - `['admin-expenses', agencyId, ...]`
  - `['admin-salaries', agencyId, ...]`
  - `['admin-employees', agencyId]`
  - Usar `queryClient.invalidateQueries({ queryKey: ['admin-clients'] })` + `['admin-payments-all']` (as demais sao recalculadas via useMemo)

### 3. `Admin.tsx`
- Novo state: `clientManagementOpen`
- Renderizar `<ClientManagementSheet>` passando `metrics.clients`, `selectedMonth`, `currentAgency.id`
- Passar `allClients`, `selectedMonth` e `onOpenManagement` ao `ClientProfitabilityCard`

## Arquivos
- `src/components/admin/CommandCenter/ClientProfitabilityCard.tsx` (editar)
- `src/components/admin/CommandCenter/ClientManagementSheet.tsx` (criar)
- `src/pages/Admin.tsx` (editar)

