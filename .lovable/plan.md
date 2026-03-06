

# Qualificação Individual por Formulário (Resolver "Todos os formulários")

## Problema

Quando a integração Meta está configurada com `form_id = "all"`, a tela de qualificação mostra um único accordion "Todos os formulários" que mistura perguntas de todos os formulários — impossibilitando qualificação individualizada. O usuário precisa ver cada formulário real separadamente.

## Solução

### 1. Detectar formulários reais a partir dos leads existentes

Quando uma integração tem `form_id = "all"`, buscar os `form_id` reais dos leads via `facebook_lead_sync_log.lead_data` (que contém o JSON bruto do Meta com o `form_id` real). Agrupar por form_id real e exibir cada um como um accordion separado.

### 2. Filtrar perguntas por formulário real

Ao detectar perguntas de um formulário específico, cruzar `facebook_lead_sync_log` (que tem `lead_id` e `lead_data.form_id`) com a tabela `leads` para buscar apenas os `custom_fields` dos leads daquele formulário específico.

### Fluxo no `FormAccordionItem`:

```text
integration.form_id === "all"?
  ├─ SIM → Buscar sync_log → Extrair form_ids reais do lead_data
  │         → Para cada form_id real, criar um sub-accordion
  │         → Cada sub-accordion filtra leads por form_id via sync_log
  └─ NÃO → Comportamento atual (formulário individual)
```

### Alterações em `src/components/crm/LeadScoringConfig.tsx`:

1. **No componente principal (`LeadScoringConfig`)**: Ao carregar integrações, expandir as que têm `form_id = "all"` — buscar formulários reais via query no `facebook_lead_sync_log` (extrair `lead_data->form_id` distintos) e criar entradas "virtuais" para cada formulário real encontrado. Se nenhum lead chegou ainda, usar `list_forms` da Meta API como fallback.

2. **No `FormAccordionItem`**: Alterar a query de detecção de perguntas (linhas 411-417) para filtrar leads pelo `form_id` real. Em vez de buscar todos os leads com `source = 'facebook_leads'`, fazer join com `facebook_lead_sync_log` para pegar apenas os `lead_id`s que vieram daquele form_id específico, e então buscar seus `custom_fields`.

3. **Exibição**: Substituir o título "Todos os formulários" pelos nomes reais de cada formulário. Cada formulário real terá seu próprio pixel ID, regras de scoring e ações independentes.

### Arquivo afetado

- `src/components/crm/LeadScoringConfig.tsx` — Única alteração

