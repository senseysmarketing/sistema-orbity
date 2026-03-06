
Objetivo: fazer a temperatura depender da qualificação (não do status), corrigir o recálculo dos leads existentes e exibir aviso quando chegam leads sem qualificação configurada.

1) Diagnóstico confirmado (raiz do problema)
- `process-lead-qualification` hoje depende de `facebook_lead_sync_log` para descobrir `form_id`.
- No banco atual, `facebook_lead_sync_log` está vazio, então a função cai em “No rules configured” para todos os leads.
- As respostas no lead vêm normalizadas (ex.: `corretor_autônomo`, `de_r$1...`) e as regras foram salvas em formato “humano” (ex.: `Corretor Autônomo`), então match exato falha.
- Em `LeadsKanban`, mover estágio recalcula temperatura por status (`getTemperatureForStatus`), sobrescrevendo a lógica de qualificação.

2) Correções de backend (qualificação confiável)
Arquivos:
- `supabase/functions/process-lead-qualification/index.ts`
- nova migration em `supabase/migrations/*`

Implementar:
- Resolver formulário sem depender de sync log:
  - tentar por `integrationId` (quando existir),
  - senão inferir por melhor aderência de perguntas entre `custom_fields` do lead e regras da agência.
- Fazer match de respostas com normalização:
  - lowercase, remover acento, trocar `_` por espaço, compactar espaços.
- Sempre persistir estado no lead:
  - se não houver regra aplicável: `temperature='cold'`, `qualification_score=0`, `qualification_source='unconfigured'`.
  - se houver regra: manter `qualification_source='auto'`.
- Garantir persistência de resultado:
  - adicionar constraint/index único em `lead_scoring_results(lead_id)` (ou ajustar para `lead_id, agency_id` e alinhar `onConflict`).

3) Correções do fluxo “Atualizar leads existentes” (rápido e correto)
Arquivo:
- `src/components/crm/LeadScoringConfig.tsx`

Implementar:
- No salvar com “Atualizar leads existentes”, não recalcular “todos facebook_leads” sem critério.
- Filtrar candidatos por compatibilidade com perguntas ativas do formulário (chaves presentes em `custom_fields`).
- Processar em lote com concorrência controlada (ex.: 10–20 por vez) para reduzir tempo total.
- Exibir feedback de progresso (processados/sucesso/falha) no toast.

4) Remover temperatura por status e manter só qualificação
Arquivos:
- `src/components/crm/LeadsKanban.tsx`
- `src/lib/leadTemperature.ts`
- (ajuste complementar) `supabase/functions/facebook-leads/index.ts`

Implementar:
- Em `LeadsKanban`, ao mover estágio:
  - atualizar apenas `status` (e timestamps/motivo de perda),
  - não atualizar `temperature`.
- Remover uso de `getTemperatureForStatus` (e limpar função/mapeamento legado no utilitário).
- Na entrada de leads Facebook (`syncLeads` + `webhook`):
  - inicializar `temperature='cold'` por padrão,
  - disparar qualificação automática após criação (também no fluxo `syncLeads`, não só webhook).

5) Badge/aviso para agência sem qualificação configurada
Arquivo:
- `src/pages/CRM.tsx` (aba Pipeline)

Implementar:
- Mostrar alerta/badge quando existir lead Facebook sem qualificação aplicada:
  - critério sugerido: `source='facebook_leads'` e `qualification_source in (null, 'unconfigured')`.
- Mensagem orientativa:
  - “Leads sem qualificação configurada. Vá em Configurações > Qualificação e configure o formulário.”
- Manter comportamento seguro: sem configuração, leads ficam “Frio”.

Seção técnica (resumo de garantias)
- Temperatura vira “derivada da qualificação” (e não do estágio do funil).
- Requalificação passa a funcionar mesmo sem `facebook_lead_sync_log`.
- Matching de respostas fica robusto contra diferenças de formatação.
- Persistência de scoring fica estável com `onConflict` válido.
- UX terá visibilidade imediata quando faltarem regras de qualificação.

Validação após implementação
1. Configurar regras do formulário e salvar com “Atualizar leads existentes”.
2. Confirmar que o lead “Henry Lowe Junior” muda para:
   - `qualification_score=4`
   - `temperature='warm'` (Morno).
3. Mover lead entre estágios e confirmar que a temperatura não muda por status.
4. Em agência sem regras, confirmar novos leads entram como Frio + alerta aparece no Pipeline.
