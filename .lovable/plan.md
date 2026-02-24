

# Corrigir tarefas migradas com status "review" para "em_revisao"

## Problema

Durante a migracao de posts para tarefas, os posts com status "Aguardando Aprovacao" foram mapeados para o status `review`. Porem, o sistema de Kanban de tarefas usa o slug `em_revisao` para a coluna "Em Revisao". Resultado: **27 tarefas ficaram invisiveis** no Kanban porque o status `review` nao corresponde a nenhuma coluna.

## Dados atuais no banco

| Status | Quantidade |
|--------|-----------|
| completed | 407 |
| review (PROBLEMA) | 27 |
| todo | 26 |
| em_revisao (correto) | 18 |
| aguardando_material | 7 |
| done | 2 |
| in_progress | 2 |

## Solucao

Executar um UPDATE simples para corrigir o status das 27 tarefas de `review` para `em_revisao`:

```sql
UPDATE tasks
SET status = 'em_revisao'
WHERE status = 'review'
  AND task_type = 'redes_sociais';
```

Apos isso, as 27 tarefas aparecerao corretamente na coluna "Em Revisao" do Kanban.

## Impacto

- Nenhum arquivo de codigo precisa ser alterado
- Apenas uma correcao de dados no banco
- As tarefas voltarao a aparecer imediatamente na tela de Tarefas
