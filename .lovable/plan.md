

# Renomear "Design" para "Criativos" e adicionar campos extras

## Resumo

Renomear o tipo de tarefa "Design" para "Criativos" (slug: `criativos`) e exibir o campo "Instrucoes Criativas" quando esse tipo for selecionado, assim como ja acontece com "Redes Sociais". Isso permite que designers recebam orientacoes visuais tanto para demandas de social media quanto para criativos de campanhas, artes avulsas, etc.

## Impacto nos dados

Existem 132 tarefas com `task_type = 'design'` no banco. Sera necessario:
- Migration SQL para renomear `design` -> `criativos` em todas as tarefas existentes
- Migration SQL para renomear o slug na tabela `task_types` das agencias que ja inicializaram os tipos padrao

## Alteracoes

### 1. Migration SQL

```sql
-- Renomear slug nas tarefas existentes
UPDATE tasks SET task_type = 'criativos' WHERE task_type = 'design';

-- Renomear slug e nome na tabela de tipos
UPDATE task_types SET slug = 'criativos', name = 'Criativos' 
WHERE slug = 'design' AND is_default = true;
```

### 2. useTaskTypes.tsx

Alterar a entrada no `DEFAULT_TYPES`:

De: `{ slug: "design", name: "Design", icon: "🎨", ... }`
Para: `{ slug: "criativos", name: "Criativos", icon: "🎨", ... }`

### 3. Tasks.tsx - Logica condicional dos campos extras

Atualmente os campos extras (instrucoes criativas, etc.) so aparecem para `redes_sociais`. Precisamos criar uma logica que mostre:

- **Para "Redes Sociais"**: todos os campos (plataforma, tipo conteudo, data publicacao, hashtags, instrucoes criativas)
- **Para "Criativos"**: apenas o campo "Instrucoes Criativas" (sem plataforma, tipo de conteudo, hashtags, data de publicacao - pois criativos nao sao necessariamente para redes sociais)

Isso sera feito com um helper: `const hasCreativeFields = ["redes_sociais", "criativos"].includes(newTask.task_type)`

Nos pontos de save (`handleCreateTask` e `handleUpdateTask`), a logica de persistencia sera ajustada:
- `platform`, `post_type`, `post_date`, `hashtags`: apenas para `redes_sociais`
- `creative_instructions`: para `redes_sociais` OU `criativos`

### 4. Tasks.tsx - Wizard (Passo 3 - Detalhes) e Edicao

Adicionar o campo "Instrucoes Criativas" quando `task_type === "criativos"`, separado dos campos de redes sociais.

### 5. Tasks.tsx - Revisao (Passo 4)

Incluir "Instrucoes Criativas" na revisao quando presente para o tipo `criativos`.

### 6. TaskDetailsDialog.tsx

Exibir "Instrucoes Criativas" tambem para tarefas do tipo `criativos`.

### 7. Edge Function ai-assist

Atualizar o prompt e a descricao do `suggested_type` para incluir `criativos`:
- Se o usuario descrever arte, banner, criativo, campanha publicitaria, material visual: usar `criativos`
- Atualizar a descricao de `creative_instructions` para preencher tambem quando `suggested_type` for `criativos`

### 8. useAIAssist.tsx

Nenhuma alteracao necessaria - os campos `creative_instructions` ja existem no tipo.

## Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| Migration SQL | Renomear slug `design` -> `criativos` em `tasks` e `task_types` |
| `src/hooks/useTaskTypes.tsx` | Renomear default type |
| `src/pages/Tasks.tsx` | Logica condicional expandida para `criativos` |
| `src/components/tasks/TaskDetailsDialog.tsx` | Exibir instrucoes criativas para tipo `criativos` |
| `supabase/functions/ai-assist/index.ts` | Atualizar prompt e tool description |

