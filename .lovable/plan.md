
# Melhorar Bloco de Rotinas: Visão por Dia + Horário + Status de Atraso

## O que muda

A aba "Semanal" do `RoutineBlock` passa de uma lista simples para uma **visão em colunas por dia da semana**, inspirada no Notion. Cada rotina semanal é criada com os dias em que deve ocorrer e um horário opcional. Se o horário passou e a rotina não foi marcada, ela aparece como "atrasada".

A aba "Mensal" mantém o layout de lista atual (com dia do mês + horário), que já é o padrão mais adequado para tarefas mensais.

---

## Banco de Dados — Migração necessária

A tabela `routines` atual tem `week_days` (array de inteiros) mas **não tem campo de horário**. Precisamos adicionar duas colunas:

| Coluna | Tipo | Descrição |
|---|---|---|
| `scheduled_time` | `TIME` nullable | Horário opcional (ex: `09:00`) |
| `day_of_month` | `INTEGER` nullable | Dia do mês para rotinas mensais (1–31) |

`day_of_month` é necessário pois na visão mensal do Notion aparece o "Dia" da tarefa (coluna "Dia" = 01, 05, 28).

**SQL da migração:**
```sql
ALTER TABLE routines ADD COLUMN IF NOT EXISTS scheduled_time TIME;
ALTER TABLE routines ADD COLUMN IF NOT EXISTS day_of_month INTEGER;
```

Sem RLS novo — usa as políticas já existentes da tabela `routines`.

---

## Lógica de Atraso

Uma rotina é considerada **atrasada** quando:

- **Semanal com horário**: o dia da semana atual corresponde a um dos `week_days` da rotina, o horário atual passou de `scheduled_time`, e ela ainda não foi marcada como concluída nesta semana.
- **Semanal sem horário**: apenas aparece destacada se o dia já passou na semana (ex: segunda marcada, hoje é quarta → atrasada).
- **Mensal com horário**: `day_of_month` passou, ou é hoje mas o horário passou, e não foi concluída neste mês.

A lógica de atraso é calculada no frontend com `date-fns` (`getDay()`, `getHours()`, `getMinutes()`), sem query extra.

---

## Interface — Aba Semanal: Colunas por Dia

### Layout

```text
[Semanal]  ← aba ativa
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Segunda     │ │  Terça       │ │  Quarta ←hoje│ │  Quinta      │ │  Sexta       │
│──────────────│ │──────────────│ │──────────────│ │──────────────│ │──────────────│
│ ☑ Checar     │ │ ☑ Checar     │ │ ☐ Checar    │ │ ☐ Checar     │ │ ☐ Checar     │
│   métricas   │ │   métricas   │ │   métricas  │ │   métricas   │ │   métricas   │
│   09:00      │ │   09:00      │ │   09:00 ⚠️  │ │   09:00      │ │   09:00      │
│              │ │              │ │             │ │              │ │              │
│ + Adicionar  │ │ + Adicionar  │ │ + Adicionar │ │ + Adicionar  │ │ + Adicionar  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

- **5 colunas** (Seg → Sex), com scroll horizontal no mobile
- Coluna do **dia atual** tem destaque sutil (fundo levemente colorido + label em negrito)
- Rotinas aparecem **nas colunas dos dias** em que estão configuradas (`week_days`)
- Badge "Hoje" na coluna atual
- Ícone ⚠️ + texto vermelho para rotinas atrasadas
- Cada coluna tem "+ Adicionar" que abre o formulário pré-selecionando aquele dia

### Card de rotina dentro da coluna
```text
┌────────────────────────────┐
│ ☐  Checar métricas         │  ← Checkbox + título
│    09:00  ⚠️ Atrasada       │  ← horário + badge de atraso (se aplicável)
└────────────────────────────┘
```

- Clique no checkbox → toggle de completion (mesmo mecanismo atual)
- Hover → aparece botão de deletar (🗑)

---

## Interface — Aba Mensal: Lista com dia do mês

```text
[Mensal]
┌─────────────────────────────────────────────────────────────────┐
│  Dia  │  Rotina                  │  Horário  │  Status          │
│───────│──────────────────────────│───────────│──────────────────│
│  01   │ ☑ Faturar Clientes       │  10:00    │  ✅ Concluída    │
│  05   │ ☑ Pagamento de Salários  │  09:00    │  ✅ Concluída    │
│  19   │ ☐ Reunião de Resultados  │  14:00    │  ⚠️ Atrasada     │
│  28   │ ☐ Planejamento SM        │  —        │  Pendente        │
└─────────────────────────────────────────────────────────────────┘
[ + Adicionar rotina mensal ]
```

- Ordenado por `day_of_month`
- Badge de atraso: se `day_of_month` < dia atual do mês e não foi concluída
- Progress bar mantida no topo

---

## Formulário de Adição (novo)

Ao clicar "+ Adicionar" abre um formulário inline (ou popover) com os campos:

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome da rotina | Input texto | Sim |
| Dias da semana | Checkboxes (Seg/Ter/Qua/Qui/Sex/Sáb/Dom) | Sim (semanal) |
| Horário | Input time (HH:MM) | Não |
| Dia do mês | Input number (1–31) | Sim (mensal) |

No fluxo de "+ Adicionar" dentro de uma **coluna específica**, o dia daquela coluna já vem pré-marcado.

---

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/RoutineBlock.tsx` | Reescrita completa: visão semanal em colunas, visão mensal em tabela, lógica de atraso, formulário expandido com horário/dia |

### Novo arquivo necessário (migração):
| Migração | Conteúdo |
|---|---|
| `add_time_to_routines` | `ALTER TABLE routines ADD COLUMN scheduled_time TIME; ADD COLUMN day_of_month INTEGER;` |

---

## O que NÃO muda

- Lógica de streak (🔥) — mantida
- Tabela `routine_completions` — sem alteração, já tem tudo necessário
- Aba Mensal usa o mesmo mecanismo de completions (por `month_number` + `year`)
- RLS policies — sem alteração

---

## Resultado final

A rotina semanal ficará visualmente idêntica à inspiração do Notion: colunas por dia, itens com checkbox, destaque para o dia atual, e badge de atraso quando o horário passou. A rotina mensal ficará em formato de tabela com dia do mês e horário, também com indicador de atraso. Tudo dentro do mesmo card do dashboard, sem poluir a tela.
