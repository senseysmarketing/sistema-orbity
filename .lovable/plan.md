
# Reformulação da Aba de Análises de Tarefas

## Visão Geral

Transformar a aba "Análises" de Tarefas em um **dashboard inteligente de produtividade da equipe**, seguindo o mesmo padrão da aba de Social Media, com foco em métricas de trabalho por usuário, análise por cliente e insights acionáveis.

---

## Estrutura Atual vs Nova

| Atual | Nova |
|-------|------|
| Cards básicos de métricas | Cards com contexto de equipe e tendências |
| Lista simples por status/prioridade | Tabela de ranking da equipe |
| Insights estáticos básicos | Insights inteligentes automáticos |
| Sem gráfico de carga | Gráfico de distribuição de carga de trabalho |
| Análise de cliente básica | Ranking de clientes com alertas |

---

## Nova Estrutura de Componentes

### Arquivos a Criar

```text
src/components/tasks/analytics/
├── types.ts                    # Interfaces de métricas
├── MetricsCards.tsx           # Cards principais com contexto
├── TeamPerformanceTable.tsx   # Tabela de ranking da equipe
├── WorkloadChart.tsx          # Gráfico de distribuição de carga
├── ClientAnalysis.tsx         # Análise por cliente com alertas
└── SmartInsights.tsx          # Insights inteligentes gerados
```

---

## Seções do Dashboard

### 1. Cards de Métricas Principais

| Card | Métrica Principal | Contexto Adicional |
|------|-------------------|-------------------|
| Total de Tarefas | Quantidade no período | Média por usuário |
| Taxa de Conclusão | % concluídas | Evolução vs mês anterior |
| Sem Atribuição | Tarefas órfãs | % do total |
| Atrasadas | Tarefas em atraso | Distribuição por usuário |

### 2. Performance da Equipe (Tabela)

| Coluna | Descrição |
|--------|-----------|
| Usuário | Avatar + nome + ícone de tendência |
| Atribuídas | Total de tarefas atribuídas |
| Concluídas | Tarefas com status "done" |
| Em Progresso | Tarefas em andamento |
| Taxa de Conclusão | (concluídas / atribuídas) * 100 |
| Tempo Médio | Dias entre criação e conclusão |
| Carga | Barra de progresso visual |

### 3. Gráfico de Carga de Trabalho

Gráfico de barras horizontais empilhadas mostrando:
- Distribuição de status por usuário
- Cores: A Fazer (cinza), Em Progresso (azul), Em Revisão (roxo), Concluída (verde)
- Identifica gargalos visuais

### 4. Análise por Cliente

| Coluna | Descrição |
|--------|-----------|
| Cliente | Nome + badge de alerta se necessário |
| Total | Quantidade de tarefas |
| Concluídas | Tarefas finalizadas |
| Taxa | % de conclusão |
| Atrasadas | Tarefas em atraso |
| Status | Indicador visual de saúde |

**Alertas:**
- Clientes sem tarefas ativas
- Clientes com taxa de conclusão abaixo de 50%
- Clientes com muitas tarefas atrasadas

### 5. Insights Inteligentes

| Categoria | Condição | Exemplo de Mensagem |
|-----------|----------|---------------------|
| Gargalo de Atribuição | Tarefas sem responsável | "12 tarefas sem responsável. Atribua para garantir execução." |
| Sobrecarga | Usuário com >40% acima da média | "Maria tem 45% mais tarefas que a média. Considere redistribuir." |
| Atraso Crítico | Tarefas >3 dias atrasadas | "8 tarefas atrasadas há mais de 3 dias. Ação urgente necessária." |
| Cliente Negligenciado | Cliente com alta taxa de atraso | "Cliente ABC tem 60% de tarefas atrasadas." |
| Melhor Performer | Maior taxa de conclusão | "João teve a maior taxa de conclusão (95%) este mês!" |
| Produtividade Alta | Taxa geral ≥75% | "Excelente! Taxa de conclusão da equipe em 82%." |
| Pico de Demanda | Muitas tarefas vencem mesmo dia | "15 tarefas vencem na sexta-feira. Considere redistribuir prazos." |

---

## Implementação Técnica

### Interfaces TypeScript

```typescript
// src/components/tasks/analytics/types.ts

interface UserMetrics {
  userId: string;
  name: string;
  avatarUrl: string | null;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksInReview: number;
  tasksTodo: number;
  completionRate: number;
  avgTimeToComplete: number; // em dias
  overdueCount: number;
}

interface ClientMetrics {
  clientId: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
  needsAttention: boolean;
}

interface SmartInsight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'alert';
  category: string;
  icon: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface TaskWithAssignments {
  id: string;
  title: string;
  status: string;
  priority: string;
  client_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  archived?: boolean;
  clients?: { name: string } | null;
  task_assignments?: { user_id: string }[];
}
```

### Queries de Dados

```typescript
// Buscar tarefas com atribuições
const { data: tasksWithAssignments } = await supabase
  .from('tasks')
  .select(`
    id, title, status, priority, client_id, due_date, 
    created_at, updated_at, archived,
    clients(name),
    task_assignments(user_id)
  `)
  .eq('agency_id', agencyId)
  .gte('due_date', monthStart)
  .lte('due_date', monthEnd);

// Buscar perfis da agência
const { data: profiles } = await supabase
  .from('profiles')
  .select('user_id, name, avatar_url')
  .in('user_id', userIds);
```

---

## Layout Visual

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Análises e Insights                                    [◀ Jan 2025 ▶] │
├────────────────────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│ │   Total    │ │    Taxa    │ │    Sem     │ │ Atrasadas  │            │
│ │    67      │ │    78%     │ │ Atribuição │ │     8      │            │
│ │ 4.2/usuário│ │  +5% vs ant│ │     12     │ │ 3 usuários │            │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘            │
├────────────────────────────────────────────────────────────────────────┤
│ Performance da Equipe                                                   │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Usuário      │ Atribuídas │ Concluídas │ Taxa │ Tempo │ Carga      │ │
│ ├──────────────┼────────────┼────────────┼──────┼───────┼────────────┤ │
│ │ 🏆 João      │     24     │     22     │ 92%  │ 2.1d  │ ████████   │ │
│ │ Maria        │     18     │     14     │ 78%  │ 2.8d  │ ██████     │ │
│ │ Pedro        │     15     │     10     │ 67%  │ 3.5d  │ █████      │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ Distribuição de Carga                                                   │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ João   [████████████████████████████] 24                           │ │
│ │ Maria  [██████████████████████] 18                                 │ │
│ │ Pedro  [██████████████████] 15                                     │ │
│ │                                                                     │ │
│ │ ■ A Fazer  ■ Em Progresso  ■ Em Revisão  ■ Concluída              │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ Insights e Recomendações                                                │
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐│
│ │ ⚠️ Tarefas sem Responsável      │ │ 🏆 Melhor Performer             ││
│ │ 12 tarefas aguardam atribuição  │ │ João teve 92% de conclusão     ││
│ │ de responsável.                 │ │ este mês! Parabéns!            ││
│ └─────────────────────────────────┘ └─────────────────────────────────┘│
│ ┌─────────────────────────────────┐ ┌─────────────────────────────────┐│
│ │ 🔴 Atraso Crítico               │ │ 📊 Distribuição Desigual       ││
│ │ 8 tarefas estão atrasadas há    │ │ Maria tem 40% mais tarefas     ││
│ │ mais de 3 dias.                 │ │ que a média da equipe.         ││
│ └─────────────────────────────────┘ └─────────────────────────────────┘│
├────────────────────────────────────────────────────────────────────────┤
│ Análise por Cliente                │ Por Status                        │
│ ┌──────────────────────────────────┐ ┌────────────────────────────────┐│
│ │ Cliente A   │ 18 │ 80% │ ✓      │ │        [Gráfico de Rosca]     ││
│ │ Cliente B   │ 12 │ 75% │ ✓      │ │  A Fazer: 15                   ││
│ │ ⚠️ Cliente C│  8 │ 38% │ ⚠️     │ │  Em Progresso: 22              ││
│ │ Cliente D   │ 10 │ 60% │ -      │ │  Em Revisão: 8                 ││
│ └──────────────────────────────────┘ │  Concluída: 22                 ││
│                                       └────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/tasks/TaskAnalytics.tsx` | Refatorar | Reorganizar para usar novos componentes |
| `src/components/tasks/analytics/types.ts` | Criar | Interfaces de métricas |
| `src/components/tasks/analytics/MetricsCards.tsx` | Criar | Cards com contexto |
| `src/components/tasks/analytics/TeamPerformanceTable.tsx` | Criar | Tabela de ranking |
| `src/components/tasks/analytics/WorkloadChart.tsx` | Criar | Gráfico de carga |
| `src/components/tasks/analytics/ClientAnalysis.tsx` | Criar | Análise por cliente |
| `src/components/tasks/analytics/SmartInsights.tsx` | Criar | Insights inteligentes |

---

## Diferenças vs Social Media

| Aspecto | Social Media | Tarefas |
|---------|-------------|---------|
| Status | draft, in_creation, pending_approval, approved, published | todo, in_progress, em_revisao, done |
| Métrica de tempo | Tempo até publicação | Tempo até conclusão |
| Contexto de cliente | Plataformas, próximo agendamento | Tipos de tarefa, prioridade |
| Insight de gargalo | Posts aguardando aprovação >48h | Tarefas em revisão >3 dias |

---

## Benefícios

1. **Visibilidade da Equipe** - Ranking claro de produtividade individual
2. **Identificação de Gargalos** - Insights automáticos sobre problemas
3. **Distribuição Justa** - Dados objetivos para redistribuir trabalho
4. **Foco no Cliente** - Alertas para clientes com problemas
5. **Reconhecimento** - Destaque para melhores performers
6. **Consistência** - Mesmo padrão visual do Social Media
