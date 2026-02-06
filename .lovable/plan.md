
# Painel de Planejamento Semanal por Cliente

## Entendimento do Problema

Com 41 clientes ativos e 264 posts em andamento, a social media precisa de uma visão estruturada para:
- Saber rapidamente quais materiais de cada cliente estão prontos
- Verificar semana a semana se o planejamento está completo
- Identificar clientes sem conteúdo programado
- Ter controle individual do progresso de cada cliente

---

## Solução Proposta: Nova Aba "Planejamento"

Criar uma nova aba no módulo Social Media chamada **"Planejamento"** com visualizacao focada em controle semanal por cliente.

### Funcionalidades Principais

1. **Visao Semanal por Cliente**
   - Grid onde cada linha representa um cliente
   - Colunas representam os dias da semana selecionada
   - Celulas mostram quantidade de posts por status

2. **Indicadores de Prontidao**
   - Verde: Material pronto (aprovado/publicado)
   - Amarelo: Em andamento (criacao/aprovacao)
   - Vermelho: Sem conteudo planejado
   - Cinza: Rascunho/Briefing

3. **Filtros e Navegacao**
   - Navegacao por semanas (anterior/proxima)
   - Filtro por status de prontidao
   - Busca por nome de cliente

4. **Card de Resumo do Cliente** (ao clicar em uma linha)
   - Total de posts da semana
   - Breakdown por status
   - Lista de posts pendentes
   - Link rapido para criar novo post

5. **Alertas Visuais**
   - Clientes sem nenhum post na semana
   - Posts atrasados (data passou e nao foi publicado)
   - Prazo de entrega proximo (due_date)

---

## Layout Visual

```text
+------------------------------------------------------------------+
|  Planejamento Semanal                      < Semana >   [Filtros] |
+------------------------------------------------------------------+
|  Semana de 10 a 16 de Fevereiro de 2026                          |
+------------------------------------------------------------------+
|  CLIENTE        | SEG | TER | QUA | QUI | SEX | SAB | DOM | TOTAL |
+------------------------------------------------------------------+
|  Space Imob     |  1  |  -  |  2  |  -  |  1  |  -  |  -  |   4   |
|  [Verde 75%]    | [V] |     | [V] |     | [A] |     |     |       |
+------------------------------------------------------------------+
|  ABC Marketing  |  -  |  1  |  -  |  -  |  -  |  -  |  -  |   1   |
|  [Vermelho]     |     | [R] |     |     |     |     |     |       |
+------------------------------------------------------------------+
|  XYZ Corp       |  2  |  1  |  1  |  2  |  1  |  -  |  -  |   7   |
|  [Verde 100%]   | [V] | [V] | [V] | [V] | [V] |     |     |       |
+------------------------------------------------------------------+

Legenda: [V]=Aprovado/Publicado  [A]=Em Aprovacao  [C]=Em Criacao  [R]=Rascunho
```

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/components/social-media/WeeklyPlanningView.tsx` | Criar | Componente principal do painel |
| `src/components/social-media/planning/ClientWeekRow.tsx` | Criar | Linha do grid por cliente |
| `src/components/social-media/planning/DayCell.tsx` | Criar | Celula do dia com indicadores |
| `src/components/social-media/planning/ClientPlanningDetails.tsx` | Criar | Sheet lateral com detalhes |
| `src/components/social-media/planning/PlanningMetrics.tsx` | Criar | Cards de metricas no topo |
| `src/pages/SocialMedia.tsx` | Modificar | Adicionar nova aba "Planejamento" |

---

## Componente Principal: WeeklyPlanningView

```typescript
// Estrutura do dados agrupados
interface ClientWeekPlan {
  clientId: string;
  clientName: string;
  days: {
    [date: string]: {
      posts: SocialMediaPost[];
      ready: number;      // aprovado + publicado
      inProgress: number; // em criacao + aguardando
      draft: number;      // rascunho/briefing
    };
  };
  weekTotal: number;
  readinessPercentage: number; // % de posts prontos
  hasOverdue: boolean;
}
```

### Metricas do Topo

- **Clientes Cobertos**: Quantos clientes tem pelo menos 1 post na semana
- **Taxa de Prontidao Geral**: % de posts prontos vs total
- **Alertas**: Clientes sem conteudo + Posts atrasados
- **Posts da Semana**: Total de posts programados

---

## Sheet de Detalhes do Cliente

Ao clicar em um cliente, abre um Sheet lateral mostrando:

1. **Cabecalho**
   - Nome do cliente
   - Badge de status geral (pronto/atencao/pendente)

2. **Resumo da Semana**
   - Posts por status (barra de progresso)
   - Plataformas usadas

3. **Lista de Posts**
   - Agrupados por dia
   - Status colorido
   - Titulo + plataforma
   - Acao rapida: ver detalhes

4. **Acoes Rapidas**
   - Criar novo post para este cliente
   - Ver todos os posts do cliente
   - Filtrar Kanban por este cliente

---

## Fluxo de Uso

```text
Social Media chega no trabalho
        |
        v
Abre aba "Planejamento"
        |
        v
Ve rapidamente todos clientes da semana
        |
        +----> Cliente verde: OK, pronto
        |
        +----> Cliente amarelo: Verificar progresso
        |              |
        |              v
        |         Clica na linha
        |              |
        |              v
        |         Ve detalhes no Sheet
        |              |
        |              v
        |         Identifica post pendente
        |
        +----> Cliente vermelho: Sem conteudo
                       |
                       v
                  Clica "Criar Post"
                       |
                       v
                  Abre formulario com cliente pre-selecionado
```

---

## Implementacao Tecnica

### 1. Estrutura de Dados
- Reutilizar `useSocialMediaPosts` existente
- Agrupar posts por `client_id` e `post_date` (ou `scheduled_date`)
- Calcular metricas de prontidao por cliente

### 2. Performance
- Memoizar agrupamentos com `useMemo`
- Virtualizar lista se necessario (muitos clientes)
- Cache ja existente no hook de posts

### 3. Responsividade
- Desktop: Grid completo com 7 dias
- Tablet: Grid com scroll horizontal
- Mobile: Lista de clientes com resumo simplificado

### 4. Integracao
- Clique em celula abre posts do dia no Sheet
- Botao "Criar Post" pre-preenche cliente
- Link para filtrar Kanban por cliente

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Navegar Kanban buscando posts de cada cliente | Ver todos clientes e status da semana em uma tela |
| Nao saber se cliente tem conteudo planejado | Indicador visual claro de cobertura |
| Verificar manualmente cada dia | Grid semanal com visao consolidada |
| Dificil priorizar trabalho | Clientes sem conteudo destacados em vermelho |

---

## Beneficios

1. **Visao Macro**: Enxergar toda a semana de todos os clientes em uma tela
2. **Priorizacao**: Identificar rapidamente quem precisa de atencao
3. **Controle**: Saber exatamente o status de cada material
4. **Produtividade**: Menos tempo navegando, mais tempo criando
5. **Proatividade**: Antecipar problemas antes que virem urgencias
