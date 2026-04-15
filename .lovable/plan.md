

# Atualizar dados da Agência Demonstração Orbity

## Contexto
A agência `546ccfe0-6fd5-4e57-840b-c7781383d770` tem dados de Janeiro 2026. Tudo precisa ser atualizado para parecer um sistema em uso ativo em Abril 2026.

## Estado Atual
- **Clientes**: 12 ativos (ok, bom volume)
- **Leads**: 25, todos com `created_at` de Jan/2026
- **Tarefas**: 48, com `due_date` de Jan/2026
- **Reuniões**: 13, todas de Jan/2026
- **Equipe**: Apenas 1 utilizador ("Usuário Demonstração")

## Alterações (via insert tool — são UPDATEs de dados)

### 1. Atualizar Leads (25 registos)
- Redistribuir `created_at` entre Março e Abril 2026
- Manter os status variados (new, contacted, meeting, proposal, won, lost)

### 2. Atualizar Tarefas (~20 mais relevantes)
- Mover `due_date` para Abril 2026 (algumas passadas, algumas hoje, algumas futuras)
- Variar status: todo, in_progress, em_revisao, done, completed
- Garantir que há tarefas para esta semana

### 3. Atualizar Reuniões (13 registos)
- Colocar ~4 como concluídas (semana passada)
- Colocar ~5 como agendadas (próximos dias/semana)
- Atualizar `start_time` e `end_time` para Abril 2026

### 4. Equipa — Limitação
- Não é possível criar utilizadores reais via SQL (requer `auth.users`). Para adicionar membros à equipe seria necessário registar contas reais no Supabase Auth.
- **Alternativa**: posso inserir perfis "fictícios" directamente na tabela `profiles` + `agency_users` com UUIDs gerados, mas estes não terão login funcional. Servem apenas para visualização na lista de equipe.
- Recomendo criar 3-4 membros fictícios: um gestor de tráfego, um designer, um social media manager.

## Execução
Serão ~5-6 chamadas de UPDATE via insert tool, agrupadas por tabela. Nenhuma alteração de schema necessária.

## Ficheiros alterados
Nenhum ficheiro de código — apenas dados no banco de dados.

