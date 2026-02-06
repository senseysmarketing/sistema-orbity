

# Enriquecer Linhas de Clientes no Planejamento Semanal

## Analise do Problema

Atualmente cada linha mostra apenas:
- Nome do cliente
- Badge de porcentagem
- Numeros nos dias da semana
- Total

Isso deixa as linhas "vazias" e nao comunica informacoes uteis sobre o que esta sendo planejado para cada cliente.

---

## Dados Disponiveis para Agregar

Analisando os posts do banco e o codigo existente, podemos adicionar:

| Dado | Fonte | Utilidade |
|------|-------|-----------|
| Plataformas usadas | `post.platform` | Saber onde o cliente vai postar (IG, FB, LI) |
| Tipos de conteudo | `post.post_type` | Mix de feed, stories, reels, carrossel |
| Usuarios atribuidos | `post.assigned_users` | Quem esta trabalhando no cliente |
| Posts atrasados | `hasOverdue` | Alertas visuais |
| Proxima entrega | `due_date` | Urgencia |

---

## Proposta de Melhoria Visual

### Nova Estrutura da Linha

```text
+----------------+------------------------------------------+-------+
| CLIENTE        | SEG TER QUA QUI SEX SAB DOM              | TOTAL |
+----------------+------------------------------------------+-------+
| Conecta Assess |                                          |       |
| [43%] [IG][FB] |  1   2   1   1   2   -   -              |   7   |
| @Maria @João   |                                          |       |
+----------------+------------------------------------------+-------+
```

### Elementos Adicionados por Linha

1. **Icones de Plataformas**
   - Mini icones coloridos (IG rosa, FB azul, LI azul escuro)
   - Mostra onde o cliente vai postar na semana

2. **Resumo de Tipos de Conteudo**
   - Icones pequenos: Feed, Stories, Reels, Carrossel
   - Mostra o mix de conteudo planejado

3. **Responsaveis (Avatares)**
   - Iniciais ou nomes dos usuarios atribuidos aos posts da semana
   - Limite de 2-3 nomes + "+X"

4. **Indicador de Urgencia**
   - Icone de alerta se tem post com due_date proximo
   - Borda vermelha se tem atraso

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/social-media/planning/types.ts` | Adicionar campos agregados ao ClientWeekPlan |
| `src/components/social-media/WeeklyPlanningView.tsx` | Calcular plataformas, tipos e usuarios por cliente |
| `src/components/social-media/planning/ClientWeekRow.tsx` | Renderizar informacoes extras |

---

## Implementacao

### 1. Atualizar Tipos (types.ts)

```typescript
export interface ClientWeekPlan {
  clientId: string;
  clientName: string;
  days: Record<string, DayData>;
  weekTotal: number;
  readyCount: number;
  readinessPercentage: number;
  hasOverdue: boolean;
  
  // NOVOS CAMPOS
  platforms: string[];           // ['instagram', 'facebook']
  contentTypes: string[];        // ['feed', 'reels', 'stories']
  assignedUsers: {               // Usuarios trabalhando neste cliente
    name: string;
    count: number;               // Quantos posts
  }[];
  nearestDueDate: Date | null;   // Proxima entrega
  hasUrgentDeadline: boolean;    // Due date em ate 2 dias
}
```

### 2. Agregar Dados (WeeklyPlanningView.tsx)

Ao construir cada ClientWeekPlan:

```typescript
// Coletar plataformas unicas
const platforms = new Set<string>();
const contentTypes = new Set<string>();
const usersMap = new Map<string, { name: string; count: number }>();
let nearestDueDate: Date | null = null;

// Para cada post do cliente na semana
weekPosts.forEach(post => {
  if (post.platform) platforms.add(post.platform);
  if (post.post_type) contentTypes.add(post.post_type);
  
  // Usuarios
  post.assigned_users?.forEach(user => {
    const existing = usersMap.get(user.user_id);
    if (existing) existing.count++;
    else usersMap.set(user.user_id, { name: user.name, count: 1 });
  });
  
  // Proxima due_date
  if (post.due_date) {
    const dueDate = parseISO(post.due_date);
    if (!nearestDueDate || dueDate < nearestDueDate) {
      nearestDueDate = dueDate;
    }
  }
});

plan.platforms = Array.from(platforms);
plan.contentTypes = Array.from(contentTypes);
plan.assignedUsers = Array.from(usersMap.values())
  .sort((a, b) => b.count - a.count);
plan.nearestDueDate = nearestDueDate;
plan.hasUrgentDeadline = nearestDueDate && differenceInDays(nearestDueDate, today) <= 2;
```

### 3. Atualizar Layout da Linha (ClientWeekRow.tsx)

```tsx
<div className="grid gap-2 py-3 px-3 ..." style={{ gridTemplateColumns: "minmax(200px, 1fr) repeat(7, 40px) 50px" }}>
  {/* Coluna do cliente - expandida */}
  <div className="flex flex-col gap-1">
    {/* Linha 1: Nome */}
    <div className="flex items-center gap-2">
      <p className="font-medium text-sm truncate">{plan.clientName}</p>
      {plan.hasUrgentDeadline && (
        <Clock className="h-3.5 w-3.5 text-orange-500" />
      )}
    </div>
    
    {/* Linha 2: Badge + Plataformas + Tipos */}
    <div className="flex items-center gap-2 flex-wrap">
      {getReadinessBadge()}
      
      {/* Plataformas */}
      <div className="flex items-center gap-0.5">
        {plan.platforms.includes('instagram') && (
          <Instagram className="h-3.5 w-3.5 text-pink-500" />
        )}
        {plan.platforms.includes('facebook') && (
          <Facebook className="h-3.5 w-3.5 text-blue-600" />
        )}
        {plan.platforms.includes('linkedin') && (
          <Linkedin className="h-3.5 w-3.5 text-blue-800" />
        )}
      </div>
      
      {/* Tipos de conteudo */}
      <div className="flex items-center gap-0.5 text-muted-foreground">
        {plan.contentTypes.includes('feed') && (
          <Image className="h-3 w-3" title="Feed" />
        )}
        {plan.contentTypes.includes('reels') && (
          <Film className="h-3 w-3" title="Reels" />
        )}
        {plan.contentTypes.includes('stories') && (
          <Zap className="h-3 w-3" title="Stories" />
        )}
        {plan.contentTypes.includes('carrossel') && (
          <LayoutGrid className="h-3 w-3" title="Carrossel" />
        )}
      </div>
    </div>
    
    {/* Linha 3: Usuarios atribuidos */}
    {plan.assignedUsers.length > 0 && (
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Users className="h-3 w-3" />
        {plan.assignedUsers.slice(0, 2).map(u => u.name.split(' ')[0]).join(', ')}
        {plan.assignedUsers.length > 2 && ` +${plan.assignedUsers.length - 2}`}
      </div>
    )}
  </div>
  
  {/* Dias e Total continuam iguais */}
</div>
```

---

## Resultado Visual

```text
ANTES:
+------------------+------------------------------+-------+
| Conecta Assesson |  1   2   1   1   2   -   -  |   7   |
| [43%]            |                              |       |
+------------------+------------------------------+-------+

DEPOIS:
+------------------------+------------------------------+-------+
| Conecta Assessoria     |  1   2   1   1   2   -   -  |   7   |
| [43%] [IG][FB] 📷🎬    |                              |       |
| 👤 Maria, João +1      |                              |       |
+------------------------+------------------------------+-------+
```

---

## Beneficios

| Aspecto | Melhoria |
|---------|----------|
| Contexto | Saber onde e que tipo de conteudo vai postar |
| Responsabilidade | Ver quem esta trabalhando em cada cliente |
| Urgencia | Identificar clientes com prazos proximos |
| Priorizacao | Mais informacao para decidir por onde comecar |

