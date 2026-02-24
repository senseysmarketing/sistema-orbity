
# Tela de Metas - Programa de Participacao nos Resultados (PPR)

## Resumo
Nova pagina "Metas & Bonus" acessivel no menu lateral, acima de "Administrativo". Inicialmente implementa o modelo PPR (Pool de Bonus), com estrutura preparada para os outros 2 modelos futuros.

## Estrutura do Banco de Dados

### Tabela `bonus_programs`
Armazena a configuracao do programa escolhido pela agencia.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| agency_id | uuid FK agencies | |
| program_type | text | 'ppr', 'salary_multiplier', 'spot_bonus' |
| name | text | Nome do programa |
| is_active | boolean | Se esta ativo |
| config | jsonb | Configuracoes especificas (ex: percentual do lucro, meta NPS, periodo) |
| created_at / updated_at | timestamptz | |

### Tabela `bonus_periods`
Cada trimestre/semestre avaliado.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| agency_id | uuid FK | |
| program_id | uuid FK bonus_programs | |
| label | text | Ex: "Q1 2026" |
| start_date / end_date | date | Periodo |
| revenue_target | numeric | Meta de faturamento |
| revenue_actual | numeric | Faturamento real (admin insere ou calcula do financeiro) |
| net_profit | numeric | Lucro liquido apurado |
| bonus_pool_percent | numeric | % do lucro para o pool |
| bonus_pool_amount | numeric | Valor calculado do pool |
| nps_target | numeric | Meta de NPS |
| nps_actual | numeric | NPS calculado |
| status | text | 'open', 'closed' |
| created_at / updated_at | timestamptz | |

### Tabela `nps_responses`
Respostas de NPS por cliente.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| agency_id | uuid FK | |
| period_id | uuid FK bonus_periods | |
| client_name | text | Nome do cliente |
| score | integer | 0-10 |
| category | text | Calculado: 'promoter', 'neutral', 'detractor' |
| comment | text | Feedback |
| created_at | timestamptz | |

### Tabela `employee_scorecards`
Avaliacao individual de cada colaborador.

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| agency_id | uuid FK | |
| period_id | uuid FK bonus_periods | |
| employee_id | uuid FK employees | |
| user_id | uuid | Referencia auth.users para controle de visibilidade |
| nps_retention_score | numeric | Nota 0-10 (peso 4) |
| technical_delivery_score | numeric | Nota 0-10 (peso 4) |
| process_innovation_score | numeric | Nota 0-10 (peso 2) |
| weighted_average | numeric | Calculado automaticamente |
| max_share | numeric | Fatia maxima do pool |
| final_bonus | numeric | Valor final a receber |
| created_at / updated_at | timestamptz | |

### Politicas RLS
- Todas as tabelas: membros da agencia podem SELECT
- INSERT/UPDATE/DELETE: apenas admins/owners da agencia
- `employee_scorecards`: usuarios comuns so veem sua propria linha (WHERE user_id = auth.uid() OR is_agency_admin())

## Navegacao

### Menu Lateral (`AppSidebar.tsx`)
- Novo item "Metas & Bonus" com icone `Trophy` acima de "Administrativo" na categoria "Administracao"
- URL: `/dashboard/goals`

### Rotas (`App.tsx`)
- Nova rota: `<Route path="goals" element={<Goals />} />`

## Componentes da Pagina

### `src/pages/Goals.tsx`
Pagina principal com logica de selecao de programa.

- Se nenhum programa ativo: exibe tela de selecao com 3 cards (PPR, Multiplicador, Spot Bonus)
- Se programa PPR ativo: renderiza `<PPRDashboard />`
- Admins podem trocar o programa via botao de configuracao

### `src/components/goals/ProgramSelector.tsx`
3 cards lado a lado para escolher o tipo de programa. Cada card tem titulo, descricao curta e icone. Apenas PPR estara habilitado, os outros 2 com badge "Em breve".

### `src/components/goals/PPRDashboard.tsx`
Componente principal do PPR, dividido em 3 blocos:

#### Bloco 1: Placar do Trimestre (visivel por todos)
4 cards de metricas:
1. **Faturamento** - valor acumulado + barra de progresso vs meta
2. **Lucro Liquido** - valor apurado
3. **Pote de Bonus** - calculado automaticamente (% do lucro)
4. **NPS da Agencia** - nota atual + indicador visual (verde se >= meta)

Seletor de periodo no topo para navegar entre trimestres.

#### Bloco 2: Calculadora de NPS (visivel para admins)
- Formulario: Nome do Cliente, Nota (0-10), Comentario
- Lista de respostas com classificacao automatica (Promotor/Neutro/Detrator com badges coloridos)
- Grafico de rosca (recharts) mostrando distribuicao Promotores/Neutros/Detratores
- Calculo automatico do NPS: `(% Promotores - % Detratores)` alimenta Card 4

#### Bloco 3: Scorecard da Equipe (admin ve todos, usuario ve so o seu)
- Lista/tabela de cards por colaborador (puxa da tabela `employees`)
- Admin insere notas 0-10 para cada criterio:
  - NPS e Retencao (peso 4) - pre-preenche do NPS se disponivel
  - Entrega Tecnica (peso 4)
  - Processos e Inovacao (peso 2)
- Media ponderada calculada: `(nps*4 + tecnica*4 + processo*2) / 10`
- Calculo financeiro: `fatia_maxima = pool / num_colaboradores`, `bonus = fatia_maxima * (media / 10)`
- Barras de progresso visuais para cada nota
- **Regra de visibilidade**: usuarios comuns veem sua propria linha normalmente e as demais com dados embacados (blur CSS) mostrando apenas o nome

### `src/components/goals/PPRConfigDialog.tsx`
Dialog para admin configurar:
- Percentual do lucro para o pool (default 10%)
- Meta de NPS (default 60)
- Meta de faturamento do periodo
- Periodo (trimestral/semestral)

### `src/components/goals/NPSChart.tsx`
Grafico de rosca com recharts mostrando Promotores (verde), Neutros (amarelo), Detratores (vermelho).

### `src/components/goals/ScorecardCard.tsx`
Card individual do colaborador com:
- Nome e cargo
- 3 inputs de nota com barras de progresso
- Media ponderada destacada
- Valor do bonus calculado
- Versao "blurred" para usuarios comuns vendo outros

## Fluxo de Dados

```text
Admin configura programa PPR
       |
       v
Admin cria periodo (Q1 2026) com metas
       |
       v
Admin insere respostas NPS --> calcula NPS automatico --> alimenta Card 4
       |
       v
Admin avalia equipe no Scorecard --> calcula bonus individual
       |
       v
Todos veem o Placar (Bloco 1)
Admins veem/editam NPS e Scorecard completo
Usuarios veem apenas seu proprio Scorecard
```

## Arquivos a Criar/Modificar

### Novos arquivos:
- `src/pages/Goals.tsx`
- `src/components/goals/ProgramSelector.tsx`
- `src/components/goals/PPRDashboard.tsx`
- `src/components/goals/PPRConfigDialog.tsx`
- `src/components/goals/NPSChart.tsx`
- `src/components/goals/ScorecardCard.tsx`
- `src/components/goals/NPSResponseForm.tsx`

### Arquivos modificados:
- `src/components/layout/AppSidebar.tsx` - adicionar item "Metas & Bonus"
- `src/App.tsx` - adicionar rota `/dashboard/goals`

### Migracao SQL:
- Criar as 4 tabelas com RLS
- Triggers de updated_at
