

# Tela de Projetos - Plano de Implementacao

## Visao Geral

Criar um modulo completo de Gestao de Projetos com dashboard executivo, detalhe por projeto com abas, e status/saude calculados automaticamente. O item de menu ficara acima de "Tarefas Gerais" no sidebar.

---

## Fase 1 - Entrega Principal (este plano)

### 1. Banco de Dados (Migration SQL)

Criar as seguintes tabelas:

**`projects`** - Tabela principal
| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| agency_id | uuid FK agencies | |
| client_id | uuid FK clients | Cliente vinculado |
| name | text | Nome do projeto |
| description | text | Descricao |
| project_type | text | Tipo (trafego, social media, SEO, branding, site, outro) |
| contract_value | numeric | Valor do contrato |
| start_date | date | Data inicio |
| end_date | date | Data fim prevista |
| is_recurring | boolean | Projeto recorrente? |
| recurrence_interval | text | monthly, quarterly, etc |
| created_by | uuid | Quem criou |
| responsible_id | uuid | Responsavel principal |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| archived | boolean default false | |

**`project_tasks`** - Tarefas do projeto (kanban proprio)
| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK projects | |
| agency_id | uuid | |
| title | text | |
| description | text | |
| status | text | backlog, in_progress, review, done |
| priority | text | low, medium, high, urgent |
| assigned_to | uuid | |
| due_date | date | |
| completed_at | timestamptz | |
| subtasks | jsonb | Checklist interno |
| sort_order | int | Ordem no kanban |
| created_at / updated_at | timestamptz | |

**`project_milestones`** - Marcos
| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| title | text | Nome do marco |
| description | text | |
| due_date | date | Data prevista |
| completed_at | timestamptz | |
| sort_order | int | Ordem |
| created_at | timestamptz | |

**`project_payments`** - Parcelas financeiras
| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| amount | numeric | Valor da parcela |
| due_date | date | Vencimento |
| paid_at | timestamptz | Data pagamento |
| status | text | pending, paid, overdue |
| description | text | |
| created_at | timestamptz | |

**`project_notes`** - Anotacoes/comunicacao
| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK | |
| content | text | |
| created_by | uuid | |
| created_at | timestamptz | |

**RLS Policies** (mesmo padrao do sistema):
- SELECT: todos os membros da agencia
- INSERT/UPDATE/DELETE: todos os membros da agencia (projetos sao colaborativos)

**Trigger**: `update_updated_at_column` nas tabelas projects e project_tasks.

---

### 2. Arquivos Frontend

**Novos arquivos a criar:**

| Arquivo | Descricao |
|---|---|
| `src/pages/Projects.tsx` | Pagina principal (dashboard executivo + lista) |
| `src/pages/ProjectDetail.tsx` | Detalhe do projeto com abas |
| `src/hooks/useProjects.tsx` | Hook com queries e mutations |
| `src/components/projects/ProjectMetricsCards.tsx` | Cards superiores (ativos, concluidos, atrasados, risco, receita) |
| `src/components/projects/ProjectsTable.tsx` | Tabela de projetos com progresso, saude, prazo |
| `src/components/projects/ProjectFormDialog.tsx` | Dialog para criar/editar projeto |
| `src/components/projects/ProjectOverview.tsx` | Aba Overview do detalhe |
| `src/components/projects/ProjectTasksKanban.tsx` | Aba Tarefas (kanban 4 colunas) |
| `src/components/projects/ProjectFinancial.tsx` | Aba Financeiro |
| `src/components/projects/ProjectNotes.tsx` | Aba Comunicacao/Notas |
| `src/components/projects/ProjectMilestones.tsx` | Aba Marcos/Timeline |
| `src/components/projects/ProjectHealthBadge.tsx` | Badge visual de saude (verde/amarelo/vermelho) |
| `src/components/projects/ProjectStatusBadge.tsx` | Status calculado automaticamente |

**Arquivos a modificar:**

| Arquivo | Mudanca |
|---|---|
| `src/components/layout/AppSidebar.tsx` | Adicionar "Projetos" acima de "Tarefas Gerais" com icone FolderKanban |
| `src/App.tsx` | Adicionar rotas `/dashboard/projects` e `/dashboard/projects/:id` |

---

### 3. Logica de Status Automatico

O status sera calculado no frontend com base em:

```text
Se todas as tarefas estao em "done" -> Concluido
Se data fim < hoje e nao concluido -> Atrasado  
Se % concluido < 30% e mais de 50% do prazo passou -> Em Risco
Se tem tarefas vencidas -> Em Risco
Caso contrario -> Em Andamento
Se nenhuma tarefa existe -> Planejamento
```

### 4. Health Score (0-100)

Calculado com base em 4 fatores (25 pontos cada):

```text
Prazo: 25 pts se dentro do prazo, proporcional se proximo, 0 se atrasado
Progresso: 25 pts * (% tarefas concluidas / % tempo decorrido)
Pendencias: 25 pts se nao tem tarefas vencidas, -5 por cada vencida
Financeiro: 25 pts * (% pago / % tempo decorrido)
```

Visualizacao:
- 80-100: Verde (Saudavel)
- 50-79: Amarelo (Atencao)
- <50: Vermelho (Critico)

---

### 5. Fluxo de Navegacao

```text
Sidebar: "Projetos"
  -> /dashboard/projects (lista + metricas)
     -> Clique no projeto
        -> /dashboard/projects/:id (detalhe com abas)
           - Overview
           - Tarefas (Kanban)
           - Financeiro
           - Marcos
           - Notas
```

---

### 6. Detalhes da Interface

**Dashboard (pagina principal):**
- 6 cards superiores: Ativos, Concluidos, Atrasados, Em Risco, Receita Ativa, Margem Estimada
- Tabela com colunas: Cliente, Projeto, Status, Progresso (barra %), Prazo (dias restantes), Saude (badge), Responsavel
- Botao "Novo Projeto" abre dialog wizard
- Filtros: status, cliente, responsavel

**Detalhe do projeto:**
- Header com nome, cliente, status badge, health score
- 5 abas usando Tabs do shadcn
- Kanban de tarefas com drag-and-drop (dnd-kit, mesmo padrao usado no CRM/Tasks)

---

## Itens Adiados para Fases Futuras

Os seguintes itens serao implementados apos a fase 1:

- Projetos recorrentes (criacao automatica mensal)
- Permissoes por cliente (portal do cliente)
- Integracao WhatsApp na aba comunicacao
- Graficos na dashboard (projetos por status, timeline, receita por mes)
- Alertas automaticos (notificacoes)
- SLA e indicadores avancados (taxa retrabalho, tempo medio)
- Metas por projeto (entrega, financeira, performance)

---

## Resumo Tecnico

| Item | Quantidade |
|---|---|
| Tabelas novas | 5 (projects, project_tasks, project_milestones, project_payments, project_notes) |
| Paginas novas | 2 (Projects, ProjectDetail) |
| Componentes novos | ~12 |
| Hook novo | 1 (useProjects) |
| Arquivos modificados | 2 (AppSidebar, App.tsx) |
| RLS Policies | 10 (SELECT + ALL para cada tabela) |
