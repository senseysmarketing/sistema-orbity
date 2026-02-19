
# Reformulação do Dashboard — Foco Individual "Meu Dia"

## Diagnóstico do Problema Atual

O dashboard hoje mostra:
- Métricas gerais da agência (todos os clientes, todos os leads, todos os posts)
- Atividade recente genérica
- Tarefas sem filtro por usuário
- Abas de CRM, Social, Performance com dados repetitivos

**O problema:** um designer, por exemplo, vê métricas de receita e leads que não têm nada a ver com o trabalho dele no dia.

---

## Nova Proposta: Dashboard Pessoal "Meu Dia"

A ideia central é dividir o dashboard em duas visões:

1. **Para usuários comuns** (`agency_user`): foco total no dia do indivíduo — tarefas atribuídas a ele, posts para revisar, próximas reuniões e alertas pessoais.
2. **Para admins** (`agency_admin`/`owner`): mantém uma visão consolidada da agência, mas com seção pessoal em destaque no topo.

---

## Layout Proposto

### Seção 1 — Cabeçalho com resumo do dia
- Saudação personalizada com nome e foto do usuário
- Data atual
- Barra de progresso do dia: "X de Y tarefas concluídas hoje"
- Indicador: "Você tem X tarefas atrasadas" com alerta visual

### Seção 2 — Cards de Status Pessoal (linha horizontal)
Quatro cards compactos:
- **Minhas Tarefas Hoje**: tarefas com due_date = hoje atribuídas ao usuário
- **Tarefas Atrasadas**: tarefas passadas do prazo atribuídas ao usuário
- **Próxima Reunião**: countdown da próxima reunião do usuário
- **Posts para Revisar**: posts em status `pending_approval` atribuídos ao usuário

### Seção 3 — Grid principal (2 colunas)

**Coluna Esquerda — Tarefas do Dia e Próximas**
- Lista de tarefas para hoje (com checkbox para marcar concluído)
- Lista de tarefas da semana (agrupadas por data)
- Tarefas atrasadas destacadas em vermelho
- Botão "Ver todas as tarefas"

**Coluna Direita — Agenda e Posts**
- Reuniões de hoje (horário, título, cliente)
- Posts do dia (social media atribuídos ao usuário com status)
- Próximos eventos da semana

### Seção 4 — Ações Rápidas (apenas admins ou todos)
- Criar tarefa, agendar reunião, novo post

### Seção 5 — Métricas da Agência (apenas admins, colapsável)
- Cards atuais de receita, leads, clientes (para não perder essa visão)

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/dashboard/MyDayHeader.tsx` | Criar | Cabeçalho com saudação, data, progresso do dia |
| `src/components/dashboard/MyStatusCards.tsx` | Criar | 4 cards: tarefas hoje, atrasadas, próxima reunião, posts |
| `src/components/dashboard/MyTasksList.tsx` | Criar | Lista de tarefas do usuário com checkbox interativo |
| `src/components/dashboard/MyAgendaAndPosts.tsx` | Criar | Reuniões e posts do dia do usuário |
| `src/pages/Index.tsx` | Modificar | Reorganizar layout e buscar dados filtrados por usuário |

---

## Lógica de Dados

### Filtros aplicados por usuário

**Tarefas do usuário** — busca tasks onde:
- O usuário está em `task_assignments` (atribuído), OU
- `created_by = user_id` (criado por ele)

```typescript
// Tarefas atribuídas ao usuário
const { data: myAssignments } = await supabase
  .from('task_assignments')
  .select('task_id')
  .eq('user_id', profile.user_id);

const myTaskIds = myAssignments?.map(a => a.task_id) || [];

const { data: myTasks } = await supabase
  .from('tasks')
  .select('*, clients(name)')
  .eq('agency_id', currentAgency.id)
  .or(`id.in.(${myTaskIds.join(',')}),created_by.eq.${profile.user_id}`)
  .neq('status', 'done');
```

**Reuniões do usuário** — da agenda, filtrando pelo `created_by` ou participação.

**Posts do usuário** — posts em `post_assignments` onde `user_id = profile.user_id`.

---

## Detalhamento dos Componentes

### MyDayHeader
```
┌─────────────────────────────────────────────────┐
│ 👤 Bom dia, Maria!          Quinta, 19 Fev 2026 │
│ Agência: Conecta Digital                         │
│ ████████░░░░ 5 de 12 tarefas concluídas (42%)   │
│ ⚠️ Você tem 3 tarefas atrasadas                  │
└─────────────────────────────────────────────────┘
```

### MyStatusCards (4 cards)
```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Hoje     │ │Atrasadas │ │ Próxima  │ │ Posts    │
│    4     │ │    3     │ │ 14:30    │ │    2     │
│ tarefas  │ │tarefas ⚠️│ │ reunião  │ │ aprovar  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### MyTasksList (coluna esquerda)
```
Tarefas de Hoje
├── ☐ [URGENTE] Criar arte para cliente X  ← atrasada (vermelho)
├── ☐ Revisar copy campanha Y              ← hoje
└── ☑ Enviar relatório mensal              ← concluída

Esta Semana
├── ☐ Amanhã — Briefing cliente Z
├── ☐ Sexta — Publicar stories
```

### MyAgendaAndPosts (coluna direita)
```
Reuniões de Hoje
├── 10:00 — Kickoff Projeto Alpha (45min)
└── 15:00 — Apresentação Cliente Beta

Posts para Revisar
├── [IG] Arte feed — Cliente X  [Aguard. Aprovação]
└── [FB] Carrossel  — Cliente Y  [Em Criação]
```

---

## Comportamento por Perfil

| Componente | agency_user | agency_admin |
|-----------|-------------|--------------|
| MyDayHeader | ✅ | ✅ |
| MyStatusCards | ✅ | ✅ |
| MyTasksList | Apenas tarefas dele | Tarefas dele + resumo da equipe |
| MyAgendaAndPosts | Apenas dele | Dele + métricas agência |
| DashboardMetrics (atual) | ❌ Removido | ✅ Colapsável abaixo |
| QuickActions | Simplificado | Completo |

---

## Resultado Esperado

O dashboard deixa de ser uma "TV de métricas" e vira um **assistente pessoal do dia** — cada pessoa abre o sistema e sabe exatamente o que precisa fazer.
