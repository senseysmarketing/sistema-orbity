

# Adicionar Reunioes na Linha do Tempo de Hoje

## Problema
O componente `DayTimeline` mostra rotinas, tarefas, posts e notificacoes, mas nao inclui reunioes. As reunioes do dia ja sao buscadas no `Index.tsx` (via tabela `meetings`), porem nao sao passadas para o `DayTimeline`.

## Solucao

### `src/components/dashboard/DayTimeline.tsx`

1. **Expandir `TimelineItem.source`** para incluir `'meeting'`
2. **Adicionar fetch de reunioes** no `fetchData`: buscar da tabela `meetings` onde `agency_id` corresponde, `start_time` e no dia de hoje, `status != 'cancelled'`, e o usuario e organizador OU esta nos `participants`
3. **Construir meeting items**: cada reuniao vira um `TimelineItem` com `source: 'meeting'`, horario extraido do `start_time`, titulo, e nome do cliente (join com `clients`)
4. **Novo campo opcional** em `TimelineItem`: `meetingDuration?: number`, `meetingLocation?: string`
5. **Renderizar meetings** no JSX: icone `Calendar` azul, badge "Reuniao", horario, titulo, cliente e duracao
6. **Incluir no merge/sort** junto com os outros itens

### Detalhes da query
```sql
SELECT id, title, start_time, duration_minutes, status, location, google_meet_link,
       clients(name)
FROM meetings
WHERE agency_id = ? 
  AND start_time >= todayT00:00:00
  AND start_time <= todayT23:59:59
  AND status != 'cancelled'
```

Filtrar no JS: reunioes onde `organizer_id === user_id` OU `participants` inclui `user_id`.

### Visual do item na timeline
```
[Calendar icon azul] HH:mm [Badge "Reuniao"]
                     Titulo da reuniao
                     Cliente · 30min
```

