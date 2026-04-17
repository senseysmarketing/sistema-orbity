

# Implementação: Reorganização Sheet WhatsApp + 3 Guardrails

## Verificações antes de codar

Preciso confirmar 2 pontos no código atual:
1. **Auto-save existe?** Os componentes `SendingScheduleManager` e `AllowedSourcesManager` mostrados acima usam botão "Salvar" explícito (`saveMutation.mutate()` em `Button onClick`), não auto-save. Os badges/pills devem manter esse padrão (atualizar state local + botão Salvar) OU migrar para auto-save com debounce.
2. **Estrutura atual do `WhatsAppTemplateManager.tsx`** — confirmar onde estão os badges, tabs e managers para reordenar corretamente.

## Decisão sobre Guardrail #2 (Auto-Save)

Os componentes atuais NÃO têm auto-save — usam `hasChanges` + botão "Salvar Origens"/"Salvar Horários". O guardrail pede para "preservar o auto-save se ele existia". Como não existia, vou **manter o padrão atual** (state local + botão Salvar visível quando `hasChanges=true`). Os novos botões/pills apenas atualizam state local via `setSelectedSources` / `setAllowedDays` — o botão Salvar continua disparando a mutation. Isso preserva o comportamento e evita writes excessivos no DB.

## Mudanças

### 1. `WhatsAppTemplateManager.tsx` — Reorganização hierárquica
- Mover Tabs (Saudação/Follow-up + Timeline + Editor + Preview) para o topo, logo após badges
- Criar `<Accordion type="single" collapsible>` no fim com:
  - Trigger: ícone `Settings` + "Configurações Globais de Disparo" + resumo dinâmico (ex: "Horário restrito · 3 origens")
  - Content: `<SendingScheduleManager />` + `<Separator />` + `<AllowedSourcesManager />`
- Aplicar `space-y-8` no container principal
- Imports: `Accordion, AccordionItem, AccordionTrigger, AccordionContent`, `Settings`, `Separator`

### 2. `SendingScheduleManager.tsx`
- **Atalhos rápidos** (3 botões `variant="outline" size="sm"` acima dos selects):
  - `Comercial` → `setEnabled(true); setStartHour(8); setEndHour(18); setAllowedDays([1,2,3,4,5])`
  - `Estendido` → `setEnabled(true); setStartHour(8); setEndHour(22); setAllowedDays([0,1,2,3,4,5,6])`
  - `24/7` → `setEnabled(false); setStartHour(0); setEndHour(23); setAllowedDays([0,1,2,3,4,5,6])` ✅ Guardrail #1
- **Layout horizontal**: ícone `Clock` + Select Início + "até" + Select Fim em uma linha (`flex items-center gap-3`)
- **Day pills**: substituir checkboxes por botões redondos (`h-9 w-9 rounded-full`), ativo=`bg-primary`, inativo=`bg-background border-input`
- Imports adicionais: `Briefcase, Sun, Infinity, cn` de utils
- **Botão "Salvar Horários" preservado** (continua aparecendo quando `hasChanges`)

### 3. `AllowedSourcesManager.tsx`
- Remover `Card` wrapper, checkboxes e linha "Selecionar todas" (mover para link discreto inline)
- **Grid de badges interativos** (`flex flex-wrap gap-2`):
  - Cada origem = `<button>` com ícone + label
  - Ativo: `bg-primary text-primary-foreground border-primary`
  - Inativo: `bg-background text-muted-foreground border-input hover:border-primary/40`
- Mapa de ícones com fallback `?? Tag`:
  ```ts
  const SOURCE_ICONS = {
    manual: Hand, website: Globe, social_media: Share2,
    email: Mail, phone: Phone, referral: Users,
    event: Calendar, advertisement: Megaphone,
    facebook_leads: Facebook, facebook_ads: Facebook,
    other: MoreHorizontal,
  };
  ```
- ✅ Guardrail #3: Imports completos de `lucide-react`: `Hand, Globe, Share2, Mail, Phone, Users, Calendar, Megaphone, Facebook, MoreHorizontal, Tag` + manter `Filter, Save, Loader2`
- Link "Selecionar todas / Desmarcar todas" como `<button className="text-xs text-primary hover:underline">` no header
- **Botão "Salvar Origens" preservado** (continua aparecendo quando `hasChanges`)

### 4. Resumo dinâmico no AccordionTrigger
Calcular no `WhatsAppTemplateManager` ou ler dos hooks dos managers. Solução simples: criar um pequeno hook/query inline no parent que lê `whatsapp_accounts.sending_schedule` e `allowed_sources` e exibe:
- `"Horário restrito · X origens"` se `schedule.enabled=true`
- `"Sem restrições · X origens"` se `schedule.enabled=false`
- `X = allowed_sources.length || "todas"`

## Guardrails aplicados

| # | Garantia | Onde |
|---|----------|------|
| 1 | "24/7" desliga restrição | `applyPreset('always')` faz `setEnabled(false)` |
| 1 | "Comercial"/"Estendido" ligam restrição | ambos fazem `setEnabled(true)` |
| 2 | Auto-save preservado | Mantém padrão atual: state local + botão Salvar (não havia auto-save antes) |
| 3 | Ícones importados | Lista completa de imports de `lucide-react` incluindo `Tag` fallback |

## Ficheiros alterados
- `src/components/crm/WhatsAppTemplateManager.tsx` (reorganização + Accordion)
- `src/components/crm/SendingScheduleManager.tsx` (presets + layout horizontal + day pills)
- `src/components/crm/AllowedSourcesManager.tsx` (grid de badges + ícones)

Sem migration. Sem mudanças em queries/edges/hooks.

