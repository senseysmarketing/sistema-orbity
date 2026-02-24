
# Renomear tipo "Conteudo" para "Trafego"

## Resumo

Alterar o tipo de tarefa padrao "Conteudo" (slug: `conteudo`) para "Trafego" (slug: `trafego`), com icone adequado e atualizar a IA para categorizar corretamente tarefas de trafego pago, campanhas, Google Ads, Meta Ads, etc.

## Alteracoes

### 1. Banco de dados (migracao SQL)

Atualizar as tarefas existentes e o registro do tipo na tabela `task_types`:

```sql
-- Atualizar o tipo na tabela task_types
UPDATE task_types
SET slug = 'trafego', name = 'Tráfego', icon = '📈'
WHERE slug = 'conteudo';

-- Atualizar tarefas que usam o slug antigo
UPDATE tasks
SET task_type = 'trafego'
WHERE task_type = 'conteudo';
```

### 2. `src/hooks/useTaskTypes.tsx`

- Alterar o tipo padrao de `{ slug: "conteudo", name: "Conteudo", icon: "✍️" }` para `{ slug: "trafego", name: "Trafego", icon: "📈" }`

### 3. `src/components/ui/task-card.tsx`

- Renomear a chave `conteudo` para `trafego` no mapa de cores (pode usar cor laranja/vermelha para representar trafego)

### 4. `src/components/tasks/analytics/TypeBreakdownChart.tsx`

- Renomear a chave `conteudo` para `trafego` no mapa de cores

### 5. `src/components/tasks/TaskAnalytics.tsx`

- Alterar o label `conteudo: 'Conteudo'` para `trafego: 'Trafego'`

### 6. `supabase/functions/ai-assist/index.ts`

- Atualizar a descricao do campo `suggested_type` substituindo `conteudo` por `trafego`
- Adicionar contexto para a IA: "Se o usuario descrever trafego pago, campanhas de anuncios, Google Ads, Meta Ads, Facebook Ads, otimizacao de campanhas, gestao de midia paga, use 'trafego'"

## Arquivos modificados

| Arquivo | Tipo de alteracao |
|---------|------------------|
| Nova migracao SQL | slug + nome + icone no banco |
| `src/hooks/useTaskTypes.tsx` | Tipo padrao fallback |
| `src/components/ui/task-card.tsx` | Mapa de cores |
| `src/components/tasks/analytics/TypeBreakdownChart.tsx` | Mapa de cores do grafico |
| `src/components/tasks/TaskAnalytics.tsx` | Label de exibicao |
| `supabase/functions/ai-assist/index.ts` | Prompt da IA |
