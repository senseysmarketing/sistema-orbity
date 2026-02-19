
# Dashboard 2.0 — Plano Completo

## Visão Geral da Arquitetura

O novo dashboard será composto por **blocos independentes**, cada um com sua própria responsabilidade de dados. A ordem de implementação respeita as dependências: banco de dados → lógica → UI.

```text
Dashboard Index
├── MyDayHeader (existente — manter)
├── [NOVO] Bloco de Tarefas do Dia (separado de posts)
├── [NOVO] Bloco de Posts do Dia (separado de tarefas)
├── [NOVO] Reuniões do Dia (compacto, linha do header)
├── [NOVO] Rotinas (semanal + mensal)
├── [NOVO] Bloco de Notas
├── [NOVO] Linha do Tempo do Dia
└── Métricas da Agência (existente — manter colapsável)
```

---

## Fase 1 — Reestruturação Visual (Sem Banco Novo)

### 1.1 Remover `MyStatusCards`
Os 4 cards (hoje/atrasadas/reunião/posts) serão removidos. As informações migram para os cabeçalhos de cada bloco.

### 1.2 Novo layout do Index.tsx

**Antes:** 2 colunas (Tarefas | Agenda+Posts misturados)

**Depois:**
```text
Row 1: [MyDayHeader] — mantido, com streak integrado no futuro
Row 2: [Tarefas do Dia] | [Posts do Dia]  ← grid 2 colunas
Row 3: [Rotinas]                           ← largura total
Row 4: [Bloco de Notas] | [Linha do Tempo] ← grid 2 colunas
Row 5: [Métricas da Agência] ← colapsável, só admins
```

### 1.3 Novo `MyPostsList` (espelho exato do `MyTasksList`)
- Seção "Atrasados" (posts com `scheduled_date` passado, não publicados)
- Seção "Hoje" (posts com `scheduled_date` = hoje)
- Seção "Esta Semana" (posts desta semana não publicados)
- Cada linha: plataforma (ícone) + título + cliente + badge de status
- Botão "Ver todos" → `/dashboard/social-media`

### 1.4 Reuniões integradas no header de Tarefas
Ao invés de um card separado de reuniões, adiciona uma faixa discreta no topo do dashboard mostrando a próxima reunião do dia (se houver).

---

## Fase 2 — Rotinas (Novo banco + UI)

### 2.1 Banco de Dados — 2 novas tabelas

**Tabela `routines`** — define a rotina em si:
```sql
CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('weekly', 'monthly')),
  week_days INTEGER[] DEFAULT '{}',    -- [1,2,3,4,5] = Seg a Sex (só para weekly)
  order_position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Tabela `routine_completions`** — registra cada check:
```sql
CREATE TABLE routine_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID REFERENCES routines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  week_number INTEGER,    -- ISO week (para weekly)
  month_number INTEGER,   -- mês do ano (para monthly)
  year INTEGER
);
```

Com esse modelo:
- O "reset" é automático — nunca apagamos dados, só verificamos se existe completion para a semana/mês atual
- Mantemos histórico para calcular streaks e % de execução

### 2.2 RLS Policies
- Usuário só vê suas próprias rotinas
- Completions só lidos/escritos pelo próprio usuário

### 2.3 Componente `RoutineBlock`

```text
[Rotinas]
├── Tabs: [Semanal] [Mensal]
├── Botão "+ Adicionar rotina"
├── Lista de rotinas com checkbox
│   ☑ Revisar métricas de clientes    [seg-sex]  ← marcada essa semana
│   ☐ Enviar relatório semanal         [sex]
│   ☐ Backup de arquivos               [mensal]
└── Progresso: 1/3 concluídas esta semana (33%)
```

- Checkbox = `routine_completions` INSERT (marcar) ou DELETE (desmarcar)
- "Reset" = não existe, é calculado: se `week_number` atual não tem completion, aparece desmarcado
- Arrastar para reordenar (dnd-kit, já instalado)
- Badge de streak: 🔥 3 semanas consecutivas

---

## Fase 3 — Bloco de Notas (Novo banco + UI)

### 3.1 Banco de Dados — 1 nova tabela

**Tabela `notes`**:
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  content TEXT DEFAULT '',
  is_pinned BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  color TEXT DEFAULT 'default',   -- para futuro color coding
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Componente `NotesBlock`

Layout inspirado no Apple Notes:
```text
[Bloco de Notas]
├── Header: 🔍 Busca + [+ Nova Nota]
├── Coluna esquerda (30%): lista de notas
│   ├── 📌 Reunião com cliente X  (14 fev)
│   ├── ⭐ Ideas de campanha      (13 fev)
│   └── Checklist onboarding     (12 fev)
└── Coluna direita (70%): editor da nota selecionada
    ├── Título (editável inline)
    ├── Data de modificação
    ├── Área de texto (com suporte a checklist: "- [ ] item")
    └── Botões: [⭐ Favoritar] [📌 Fixar] [→ Criar Tarefa] [🗑 Excluir]
```

**Funcionalidades:**
- **Salvamento automático:** `debounce` de 800ms — salva enquanto o usuário digita
- **Checklist nativo:** linhas começando com `- [ ]` ou `- [x]` viram checkboxes clicáveis
- **Pesquisa:** filtra por título + conteúdo localmente (sem query extra)
- **Fixar no topo:** `is_pinned = true` flutua para o topo da lista
- **Favoritar:** `is_favorite = true` com ícone ⭐
- **Transformar em Tarefa:** abre o `TaskFormDialog` pré-preenchido com o título e conteúdo da nota

### 3.3 Mobile
No mobile, a coluna esquerda vira uma lista com tap para abrir a nota em tela cheia.

---

## Fase 4 — Linha do Tempo do Dia

### 4.1 Fonte de dados
Reutiliza a tabela `notifications` que **já existe** — não cria infraestrutura nova. Busca as notificações do usuário do dia atual, ordenadas por `created_at`.

```sql
SELECT * FROM notifications
WHERE user_id = ? AND agency_id = ?
AND created_at::date = today
ORDER BY created_at DESC
LIMIT 15
```

### 4.2 Componente `DayTimeline`

```text
[Linha do Tempo de Hoje]
  09:12  🎯  Novo lead: João Silva
  10:03  📅  Reunião criada: Briefing mensal
  10:50  ✅  Post aprovado: Campanha Março
  11:14  💬  Lead respondeu: Maria Costa
  12:00  ✅  Tarefa concluída: Relatório X
```

- Ícone por tipo de evento (lead, task, post, meeting, reminder)
- Timestamp formatado (HH:mm)
- Scroll interno se tiver muitos eventos
- Clicável → leva para o item correspondente

---

## Fase 5 — Gamificação (Streak + %)

### 5.1 Streak de Rotina
Calculado na query de `routine_completions`:
- Semanas consecutivas onde TODAS as rotinas foram 100% concluídas = streak++
- Exibido no `MyDayHeader` como badge: 🔥 5 semanas

### 5.2 % de Execução Semanal
Calculado na hora: `completions desta semana / total de rotinas ativas`
Exibido no bloco de rotinas como barra de progresso.

### 5.3 Ranking da Equipe (simplificado)
- Query: `routine_completions` agrupado por `user_id`, semana atual
- Lista: avatar + nome + % de conclusão semanal
- Exibido como mini-tabela dentro do bloco de rotinas

**Ranking de complexidade baixa** porque já teremos os dados de completions na Fase 2.

---

## O que NÃO faremos neste momento (para evitar poluição)

| Feature | Motivo do adiamento |
|---|---|
| Arrastar blocos do dashboard | Requer persistência de layout por usuário — fase 2 |
| Ativar/desativar blocos via UI | Idem — fase 2, mas o código já será modular |
| Realtime (socket) na Linha do Tempo | Polling simples de 30s já resolve |
| Níveis e badges de gamificação | Exige design system próprio |
| Editor rico (negrito, listas) na nota | Markdown simples já resolve 90% dos casos |

---

## Resumo dos Arquivos

### Novos arquivos:
| Arquivo | Conteúdo |
|---|---|
| `src/components/dashboard/MyPostsList.tsx` | Espelho do MyTasksList para posts |
| `src/components/dashboard/RoutineBlock.tsx` | Bloco de rotinas semanal/mensal |
| `src/components/dashboard/NotesBlock.tsx` | Bloco de notas estilo Apple Notes |
| `src/components/dashboard/DayTimeline.tsx` | Linha do tempo do dia |

### Arquivos modificados:
| Arquivo | Mudança |
|---|---|
| `src/pages/Index.tsx` | Novo layout modular, removendo MyStatusCards, adicionando os 4 novos blocos |
| `src/components/dashboard/MyDayHeader.tsx` | Adicionar streak de rotina (fase 5) |

### Migrações:
| Migração | Conteúdo |
|---|---|
| `create_routines_table` | Tabelas `routines` + `routine_completions` + RLS |
| `create_notes_table` | Tabela `notes` + RLS |

---

## Ordem de Implementação Recomendada

1. **Fase 1** — Reestruturação visual (zero banco) → resultado imediato
2. **Fase 2** — Rotinas (banco + UI) → feature mais impactante para retenção
3. **Fase 3** — Bloco de Notas (banco + UI)
4. **Fase 4** — Linha do Tempo (zero banco novo, usa notifications)
5. **Fase 5** — Gamificação (usa dados de Fase 2)

Cada fase entrega valor sozinha. Podemos implementar tudo de uma vez ou por partes — você decide.
