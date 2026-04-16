

# Health Score Dinâmico — Algoritmo Real

## Resumo
Substituir o Health Score estático (baseado em meses/grade A-D) por um algoritmo numérico 0-100 com dados reais de tarefas, reuniões e NPS. Gauge visual SVG com cores e mensagem de acção.

---

## Ficheiros alterados

### 1. `src/components/clients/ClientHealthScore.tsx` — Reescrita completa

**Nova interface:**
```typescript
interface ClientHealthScoreProps {
  client: any;
  tasks: any[];
  meetings: any[];
  npsScore?: number | null;
  variant?: "badge" | "circle";
}
```

**Algoritmo `calculateDynamicScore()`:**
- Base: 100 pontos
- **Tarefas atrasadas** (due_date < hoje & status ≠ done): −10 por cada, máx −40
- **Reuniões**: se última reunião > 30 dias atrás E sem reuniões futuras → −20
- **NPS**: ≥ 9 → +10 | ≤ 6 → −30
- Clamp final entre 0 e 100

**Faixas de cor/texto:**
| Faixa | Cor | Label | Mensagem |
|-------|-----|-------|----------|
| 80-100 | Emerald | Excelente | "Cliente saudável e engajado. Oportunidade para upsell." |
| 50-79 | Amber | Atenção | "Alguns atrasos ou falta de alinhamento. Agende uma reunião." |
| 0-49 | Red | Crítico | "Ação Imediata: Cliente em alto risco de cancelamento." |

**Visual (variant="circle"):** Gauge SVG circular (arco de 270°) com score numérico ao centro, cor dinâmica, label e mensagem abaixo. O badge variant usa a mesma lógica de cor.

### 2. `src/pages/ClientDetail.tsx` — Injeção de dados

**Query NPS:** Adicionar ao bloco `Promise.all` do `dashboardData`:
```typescript
supabase
  .from("nps_responses")
  .select("score")
  .eq("agency_id", currentAgency.id)
  .eq("client_name", client?.name || "")
  .order("response_date", { ascending: false })
  .limit(1)
```
Nota: `nps_responses` não tem `client_id`, usa `client_name` (text match).

**Props atualizadas:**
```tsx
<ClientHealthScore
  client={client}
  tasks={tasks}
  meetings={meetings}
  npsScore={npsScore}
  variant="circle"
/>
```

A query de NPS depende de `client?.name`, então será adicionada como query separada (não no Promise.all inicial, que roda antes de `client` estar disponível — ou condicional dentro do mesmo).

---

## Guardrails
- Zero alteração no banco de dados
- NPS match por `client_name` (campo existente) — sem migration
- Se NPS não encontrado, passa `undefined` (sem penalização)
- Score clamped 0-100, nunca NaN

