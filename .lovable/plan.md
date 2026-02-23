

# Tela de Projetos - Plano de Implementacao

## Visao Geral

Criar um modulo completo de Gestao de Projetos com dashboard executivo, detalhe por projeto com abas, status e saude calculados automaticamente, e integracao com IA para criacao assistida. O item "Projetos" ficara acima de "Tarefas Gerais" no sidebar com icone FolderKanban.

---

## Fase 1 - Entrega Completa

### 1. Banco de Dados (Migration SQL)

Criar 5 tabelas com RLS e triggers:

**`projects`** - Tabela principal
| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK default gen_random_uuid() | |
| agency_id | uuid FK agencies NOT NULL | |
| client_id | uuid FK clients | Cliente vinculado |
| name | text NOT NULL | Nome do projeto |
| description | text | |
| project_type | text default 'outro' | trafego, social_media, seo, branding, site, outro |
| start_date | date | |
| end_date | date | |
| is_recurring | boolean default false | |
| recurrence_interval | text | monthly, quarterly, etc |
| created_by | uuid | |
| responsible_id | uuid | Responsavel principal |
| archived | boolean default false | |
| created_at | timestamptz default now() | |
| updated_at | timestamptz default now() | |

**`project_tasks`** - Tarefas do kanban do projeto
| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK projects NOT NULL | |
| agency_id | uuid NOT NULL | |
| title | text NOT NULL | |
| description | text | |
| status | text default 'backlog' | backlog, in_progress, review, done |
| priority | text default 'medium' | low, medium, high, urgent |
| assigned_to | uuid | |
| due_date | date | |
| completed_at | timestamptz | |
| subtasks | jsonb default '[]' | Checklist interno |
| sort_order | int default 0 | |
| created_at | timestamptz default now() | |
| updated_at | timestamptz default now() | |

**`project_milestones`** - Marcos/Fases
| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK NOT NULL | |
| title | text NOT NULL | |
| description | text | |
| due_date | date | |
| completed_at | timestamptz | |
| sort_order | int default 0 | |
| created_at | timestamptz default now() | |

**`project_payments`** - Parcelas financeiras
| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK NOT NULL | |
| amount | numeric NOT NULL | |
| due_date | date | |
| paid_at | timestamptz | |
| status | text default 'pending' | pending, paid, overdue |
| description | text | |
| created_at | timestamptz default now() | |

**`project_notes`** - Anotacoes e comunicacao
| Coluna | Tipo | Descricao |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK NOT NULL | |
| content | text NOT NULL | |
| created_by | uuid | |
| created_at | timestamptz default now() | |

**RLS**: Todas as tabelas usam `user_belongs_to_agency(agency_id)` para SELECT e operacoes de escrita, seguindo o padrao existente.

**Triggers**: `update_updated_at_column` em projects e project_tasks.

---

### 2. Arquivos Frontend

**Novos arquivos:**

| Arquivo | Descricao |
|---|---|
| `src/pages/Projects.tsx` | Dashboard executivo com cards de metricas, filtros e tabela de projetos |
| `src/pages/ProjectDetail.tsx` | Detalhe do projeto com 5 abas (Overview, Tarefas, Financeiro, Marcos, Notas) |
| `src/hooks/useProjects.tsx` | Hook com queries (React Query), mutations CRUD, e funcoes de calculo de status/saude |
| `src/components/projects/ProjectMetricsCards.tsx` | 6 cards: Ativos, Concluidos, Atrasados, Em Risco, Receita Ativa, Margem |
| `src/components/projects/ProjectsTable.tsx` | Tabela com colunas: Cliente, Projeto, Status, Progresso (barra), Prazo, Saude (badge), Responsavel |
| `src/components/projects/ProjectFormDialog.tsx` | Dialog wizard para criar/editar projeto, com step de IA para pre-preencher descricao e tipo |
| `src/components/projects/ProjectOverview.tsx` | Aba Overview: resumo do projeto, health score visual, status automatico |
| `src/components/projects/ProjectTasksKanban.tsx` | Kanban 4 colunas (Backlog, Em Andamento, Em Revisao, Concluido) com dnd-kit |
| `src/components/projects/ProjectFinancial.tsx` | Aba Financeiro: parcelas, valor recebido, pendente, tabela de pagamentos |
| `src/components/projects/ProjectNotes.tsx` | Aba Notas: lista de anotacoes com input para nova nota |
| `src/components/projects/ProjectMilestones.tsx` | Aba Marcos: timeline visual com fases, progresso por marco |
| `src/components/projects/ProjectHealthBadge.tsx` | Badge colorido (verde/amarelo/vermelho) com score 0-100 |
| `src/components/projects/ProjectStatusBadge.tsx` | Badge de status calculado automaticamente |

**Arquivos a modificar:**

| Arquivo | Mudanca |
|---|---|
| `src/components/layout/AppSidebar.tsx` | Inserir item "Projetos" (icone FolderKanban) acima de "Tarefas Gerais" na categoria "Operacional" |
| `src/App.tsx` | Adicionar rotas `projects` e `projects/:id` dentro do grupo `/dashboard` |

---

### 3. Logica de Status Automatico (calculada no frontend)

```text
Se nenhuma tarefa existe           -> Planejamento
Se todas as tarefas em "done"      -> Concluido
Se end_date < hoje e nao concluido -> Atrasado
Se progresso < 30% e > 50% do prazo passou -> Em Risco
Se tem tarefas com due_date vencida -> Em Risco
Caso contrario                     -> Em Andamento
```

### 4. Health Score (0-100)

4 fatores com 25 pontos cada:

```text
Prazo:      25 se dentro do prazo, proporcional se proximo, 0 se atrasado
Progresso:  25 * min(1, % tarefas concluidas / % tempo decorrido)
Pendencias: 25, -5 por cada tarefa vencida (min 0)
Financeiro: 25 * min(1, % pago / % tempo decorrido)
```

Cores: 80-100 verde, 50-79 amarelo, abaixo de 50 vermelho.

---

### 5. Integracao com IA

O formulario de criacao de projeto tera um step de IA (usando o mesmo hook `useAIAssist` e a edge function `ai-assist` existentes) que, a partir de um prompt livre do usuario (ex: "Projeto de gestao de trafego para cliente X por 3 meses"), sugere:
- Nome do projeto
- Tipo
- Descricao
- Marcos sugeridos (Planejamento, Execucao, Entrega)

O usuario pode aceitar, editar ou ignorar as sugestoes.

---

### 6. Fluxo de Navegacao

```text
Sidebar: "Projetos"
  -> /dashboard/projects (dashboard + tabela)
     -> Clique no projeto
        -> /dashboard/projects/:id (detalhe com abas)
           - Overview
           - Tarefas (Kanban com drag-and-drop)
           - Financeiro
           - Marcos (Timeline)
           - Notas
```

---

### 7. Detalhes da Interface

**Dashboard (pagina principal):**
- 6 cards de metricas no topo
- Filtros: status calculado, cliente, responsavel
- Tabela com barra de progresso, health badge, dias restantes
- Botao "Novo Projeto" abre dialog com step de IA

**Detalhe do projeto:**
- Header com nome, cliente, status badge, health score, botao editar/arquivar
- 5 abas usando Tabs (padrao existente com grid no desktop, scroll no mobile)
- Kanban de tarefas com dnd-kit seguindo mesmo padrao do CRM e Social Media (containerId para drag-and-drop)

---

## Itens Adiados para Fases Futuras

- Projetos recorrentes (criacao automatica mensal via cron)
- Permissoes por cliente (portal externo)
- Integracao WhatsApp na aba comunicacao
- Graficos avancados (projetos por status, receita por mes)
- Alertas automaticos via notificacoes
- SLA e indicadores avancados (taxa retrabalho, tempo medio)
- Metas por projeto (entrega, financeira, performance)

---

## Resumo Tecnico

| Item | Quantidade |
|---|---|
| Tabelas novas | 5 |
| Paginas novas | 2 (Projects, ProjectDetail) |
| Componentes novos | 11 |
| Hook novo | 1 (useProjects) |
| Arquivos modificados | 2 (AppSidebar, App.tsx) |
| RLS Policies | 10 (SELECT + ALL por tabela) |
| Integracao IA | Reuso do ai-assist existente para criacao assistida |

