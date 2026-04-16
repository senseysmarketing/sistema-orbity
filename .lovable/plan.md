

# Corrigir Algoritmo de Health Score — Diferenciação Real

## Problema
Todos os clientes mostram a mesma pontuação (80) porque:
- A maioria não tem NPS registado → sem impacto
- A maioria não tem reuniões → penalização fixa de -20 para todos
- Sem tarefas atrasadas → sem penalização
- O `client` (start_date) é ignorado no cálculo
- As penalizações de reunião são agrupadas num único bloco (AND), não separadas

## Alterações no algoritmo (`ClientHealthScore.tsx`)

**Aceitar `client` no cálculo** (actualmente é `_client` e ignorado).

Nova fórmula (base 100):

| Factor | Condição | Impacto |
|--------|----------|---------|
| Tarefas atrasadas | due_date < hoje & status ≠ done | -10 por tarefa (máx -40) |
| Última reunião > 30 dias | Qualquer reunião mais recente > 30 dias | -20 |
| Sem próxima reunião agendada | Nenhuma reunião futura | -10 (separado) |
| Sem reuniões nenhuma | Zero reuniões registadas | -20 |
| NPS Promotor (9-10) | | +10 |
| NPS Detrator (0-6) | | -30 |
| Tempo de casa < 3 meses | client.start_date dentro de 90 dias | -10 (sensibilidade onboarding) |

**Mudanças chave:**
1. Separar penalizações de reunião: -20 para última > 30 dias, -10 para sem futura (podem acumular)
2. Adicionar penalização de onboarding: -10 se cliente tem < 3 meses (usando `client.start_date`)
3. Passar `client` para `calculateDynamicScore` em vez de ignorar
4. Score continua clamped entre 0 e 100

### Exemplo de diferenciação esperada:
- Cliente com reunião recente + 0 tarefas atrasadas + > 3 meses → **90-100**
- Cliente sem reuniões + 0 tarefas + < 3 meses → **60** (= 100 - 20 - 10 - 10)
- Cliente com 3 tarefas atrasadas + última reunião há 40 dias → **50** (= 100 - 30 - 20)

## Ficheiros alterados
1. `src/components/clients/ClientHealthScore.tsx` — actualizar `calculateDynamicScore` com as novas regras

