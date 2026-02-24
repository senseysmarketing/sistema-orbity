
# Deletar 4 Tarefas Fantasma e Corrigir Filtro

## Problema
As 4 tarefas migradas de social media possuem status `completed` (vindo da migracao de posts), mas o componente `MyTasksList` so filtra por `status === 'done'`. Por isso elas aparecem como "atrasadas" mesmo estando concluidas.

## Correcoes

### 1. Deletar as 4 tarefas do banco
Executar SQL para remover as tarefas e seus registros relacionados:

IDs:
- `0ff8f8c7-32a0-4f76-9db4-0d66c144ddc1` (Produto em Destaque: FINISHER)
- `0b2421cb-edf3-476f-816d-59c7afbb1a6f` (Reels da Semana: XXXXX)
- `997a50bc-ff05-4cf2-a49e-8ce76c888c67` (2x Stories - Paragon)
- `fbe9cf88-0ca3-407e-995b-62aea14153c3` (2x Stories - Horiz)

```sql
DELETE FROM task_clients WHERE task_id IN (...);
DELETE FROM task_assignments WHERE task_id IN (...);
DELETE FROM tasks WHERE id IN (...);
```

### 2. Corrigir filtro no MyTasksList
**Arquivo**: `src/components/dashboard/MyTasksList.tsx`

Alterar as 3 verificacoes de `t.status === 'done'` para tambem excluir `completed`:

```
// De:
if (!t.due_date || t.status === 'done') return false;

// Para:
if (!t.due_date || t.status === 'done' || t.status === 'completed') return false;
```

Isso previne que qualquer outra tarefa migrada com status `completed` apareca indevidamente como pendente.
