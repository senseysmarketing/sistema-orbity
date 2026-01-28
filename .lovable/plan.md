
# Reformulação da Aba de Análises do Social Media

## Visão Geral

Transformar a aba "Análises" do Social Media em um **dashboard inteligente de produtividade da equipe**, focado em métricas de trabalho por usuário, clientes e insights acionáveis.

---

## Estrutura Proposta

### 1. Cards de Métricas Principais (Header)
Manter os 4 cards principais mas adicionar contexto de equipe:

| Card | Métrica | Novo Contexto |
|------|---------|---------------|
| Total de Postagens | Quantidade total | Média por usuário |
| Taxa de Conclusão | % publicados | Evolução vs mês anterior |
| Aguardando Aprovação | Pendentes | Maior tempo de espera |
| Atrasadas | Em atraso | Distribuição por usuário |

---

### 2. Nova Seção: Performance da Equipe

#### 2.1 Ranking de Produtividade
Tabela ordenável com métricas por usuário:

| Usuário | Posts Criados | Publicados | Em Criação | Taxa de Conclusão | Tempo Médio |
|---------|---------------|------------|------------|-------------------|-------------|
| Maria   | 24            | 20         | 2          | 83%               | 2.3 dias    |
| João    | 18            | 16         | 1          | 89%               | 1.8 dias    |
| Pedro   | 12            | 8          | 3          | 67%               | 3.1 dias    |

**Cálculos:**
- **Posts Criados**: Contagem de `post_assignments` onde `user_id = X`
- **Publicados**: Posts com `status = 'published'` atribuídos ao usuário
- **Taxa de Conclusão**: `(publicados / criados) * 100`
- **Tempo Médio**: Diferença entre `created_at` e `post_date` (quando publicado)

#### 2.2 Gráfico de Carga de Trabalho
Visualização horizontal de barras empilhadas mostrando distribuição de status por usuário:
- Ajuda a identificar gargalos (ex: um usuário com muitos posts "em aprovação")
- Cores por status: Briefing (cinza), Em Criação (azul), Aguardando Aprovação (amarelo), Aprovado (verde), Publicado (roxo)

---

### 3. Nova Seção: Análise por Cliente

#### 3.1 Ranking de Clientes
Expandir a seção existente com mais métricas:

| Cliente | Total Posts | Publicados | Taxa | Plataformas | Próximo Agendamento |
|---------|-------------|------------|------|-------------|---------------------|
| Cliente A | 15        | 12         | 80%  | IG, FB      | Amanhã              |
| Cliente B | 10        | 8          | 80%  | IG, LI      | Hoje                |
| Cliente C | 8         | 4          | 50%  | TT, IG      | Em 3 dias           |

#### 3.2 Clientes que Precisam de Atenção
Cards de alerta para:
- Clientes sem posts agendados para os próximos 7 dias
- Clientes com taxa de conclusão abaixo de 50%
- Clientes com posts atrasados

---

### 4. Nova Seção: Insights e Recomendações Inteligentes

Sistema de alertas contextuais baseado em padrões identificados:

| Categoria | Insight | Exemplo de Mensagem |
|-----------|---------|---------------------|
| **Gargalo de Aprovação** | Posts parados há mais de 48h | "5 posts aguardam aprovação há mais de 2 dias. Considere revisar o fluxo." |
| **Distribuição Desigual** | Um usuário com carga muito maior | "Maria tem 40% mais posts que a média. Considere redistribuir." |
| **Cliente Negligenciado** | Cliente sem conteúdo recente | "Cliente X não tem posts agendados. Última publicação há 15 dias." |
| **Pico de Demanda** | Muitos posts para mesma data | "12 posts agendados para sexta-feira. Considere distribuir melhor." |
| **Eficiência de Plataforma** | Taxa de conclusão por plataforma | "Posts do TikTok têm 45% de conclusão vs 85% do Instagram." |
| **Melhor Performer** | Reconhecimento positivo | "João teve a maior taxa de conclusão (92%) este mês!" |

---

### 5. Nova Seção: Tendências e Evolução

#### 5.1 Gráfico de Área/Linha
Mostrar evolução mensal (últimos 3-6 meses):
- Total de posts por mês
- Taxa de conclusão por mês
- Permitir comparativo entre meses

#### 5.2 Métricas de Velocidade
- **Tempo médio de criação** (briefing → aprovado)
- **Tempo médio de aprovação** (pending_approval → approved)
- **Tempo médio até publicação** (criado → publicado)

---

## Implementação Técnica

### Queries Necessárias

```typescript
// 1. Posts com atribuições para análise de equipe
const { data: postsWithAssignments } = await supabase
  .from('social_media_posts')
  .select(`
    id, status, scheduled_date, post_date, created_at,
    platform, priority, client_id, archived,
    clients(name),
    post_assignments(user_id)
  `)
  .eq('agency_id', agencyId)
  .gte('scheduled_date', monthStart)
  .lte('scheduled_date', monthEnd);

// 2. Buscar perfis para mapear user_ids
const { data: agencyUsersData } = await supabase
  .from('agency_users')
  .select('user_id')
  .eq('agency_id', agencyId);

const userIds = agencyUsersData.map(u => u.user_id);

const { data: profiles } = await supabase
  .from('profiles')
  .select('user_id, name, role, avatar_url')
  .in('user_id', userIds);
```

### Cálculos de Métricas

```typescript
interface UserMetrics {
  userId: string;
  name: string;
  postsAssigned: number;
  postsPublished: number;
  postsInProgress: number;
  postsPendingApproval: number;
  completionRate: number;
  avgTimeToPublish: number; // em dias
}

interface ClientMetrics {
  clientId: string;
  name: string;
  totalPosts: number;
  publishedPosts: number;
  upcomingPosts: number;
  nextScheduledDate: Date | null;
  completionRate: number;
}

interface SmartInsight {
  type: 'warning' | 'info' | 'success' | 'alert';
  category: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/social-media/SocialMediaAnalytics.tsx` | Refatorar | Reorganizar layout e adicionar novas seções |
| `src/components/social-media/analytics/TeamPerformanceTable.tsx` | Criar | Tabela de ranking da equipe |
| `src/components/social-media/analytics/WorkloadChart.tsx` | Criar | Gráfico de distribuição de carga |
| `src/components/social-media/analytics/ClientAnalysis.tsx` | Criar | Análise por cliente |
| `src/components/social-media/analytics/SmartInsights.tsx` | Criar | Insights inteligentes gerados |
| `src/components/social-media/analytics/TrendsChart.tsx` | Criar | Gráfico de tendências temporais |

---

## Layout Visual

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Análises e Insights                                  [◀ Jan 2025 ▶]      │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│ │   Total    │ │   Taxa     │ │ Aguardando │ │ Atrasadas  │              │
│ │    45      │ │   78%      │ │     5      │ │     3      │              │
│ │ 3.2/usuário│ │  +5% vs ant│ │ máx 3 dias │ │ 2 usuários │              │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘              │
├──────────────────────────────────────────────────────────────────────────┤
│ Performance da Equipe                                                     │
│ ┌────────────────────────────────────────────────────────────────────┐   │
│ │ Usuário       │ Criados │ Publicados │ Taxa │ Tempo Médio │ Status │   │
│ ├───────────────┼─────────┼────────────┼──────┼─────────────┼────────┤   │
│ │ 🏆 João       │   18    │     16     │ 89%  │   1.8 dias  │ ██████ │   │
│ │ Maria         │   24    │     20     │ 83%  │   2.3 dias  │ ██████ │   │
│ │ Pedro         │   12    │      8     │ 67%  │   3.1 dias  │ ████   │   │
│ └────────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────┤
│ Insights e Recomendações                                                  │
│ ┌─────────────────────────────────────┐ ┌─────────────────────────────┐  │
│ │ ⚠️ Gargalo de Aprovação             │ │ ⚡ Cliente Negligenciado     │  │
│ │ 5 posts aguardam aprovação há       │ │ Cliente ABC não tem posts   │  │
│ │ mais de 2 dias.                     │ │ agendados. Última pub: 15d  │  │
│ └─────────────────────────────────────┘ └─────────────────────────────┘  │
│ ┌─────────────────────────────────────┐ ┌─────────────────────────────┐  │
│ │ 🏆 Melhor Performer                 │ │ 📊 Distribuição Desigual    │  │
│ │ João teve 92% de conclusão este     │ │ Maria tem 40% mais posts    │  │
│ │ mês! Parabéns!                      │ │ que a média. Redistribuir?  │  │
│ └─────────────────────────────────────┘ └─────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────┤
│ Análise por Cliente                          │ Por Status/Plataforma     │
│ ┌──────────────────────────────────────────┐ │ ┌────────────────────────┐│
│ │ Cliente A    │ 15 posts │ 80% │ Amanhã   │ │ │ [Gráfico de pizza]     ││
│ │ Cliente B    │ 10 posts │ 80% │ Hoje     │ │ │                        ││
│ │ ⚠️ Cliente C │  8 posts │ 50% │ Em 3d    │ │ │                        ││
│ └──────────────────────────────────────────┘ │ └────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **Gestão de Equipe** - Visibilidade clara da produtividade de cada membro
2. **Identificação de Gargalos** - Insights automáticos sobre problemas no fluxo
3. **Distribuição Justa** - Dados para redistribuir trabalho quando necessário
4. **Foco no Cliente** - Garantir que todos os clientes recebam atenção adequada
5. **Reconhecimento** - Destacar membros com melhor desempenho (gamificação)
6. **Decisões Baseadas em Dados** - Métricas objetivas para planejamento

---

## Próximos Passos Após Implementação

1. **Filtros por período** - Permitir comparar semanas/meses
2. **Exportar relatório** - Gerar PDF com métricas do período
3. **Metas por usuário** - Definir targets e acompanhar progresso
4. **Notificações de insight** - Alertar quando padrões críticos forem detectados
