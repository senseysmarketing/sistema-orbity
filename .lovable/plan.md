

# Agrupar Variáveis de Formulário por Nome Real do Formulário

## Problema

O `form_name` não está dentro de `custom_fields` do lead — ele está na tabela `facebook_lead_integrations`. Por isso, todos os campos caem em "Outros".

## Solução

Mudar a estratégia do `useFormFieldKeys`: em vez de tentar extrair `form_name` de `custom_fields`, fazer um JOIN via `facebook_lead_sync_log` para associar cada lead ao seu formulário real.

## Alterações em `src/components/crm/WhatsAppTemplateManager.tsx`

### Reescrever `useFormFieldKeys`

1. Buscar todas as integrações da agência: `facebook_lead_integrations` → pegar `id`, `form_name`
2. Buscar os sync logs com leads: `facebook_lead_sync_log` → pegar `integration_id`, `lead_id`
3. Buscar os leads com `custom_fields` correspondentes
4. Agrupar os campos por `form_name` da integração

Fluxo simplificado:
- Query 1: `facebook_lead_integrations` da agência → mapa `integration_id → form_name`
- Query 2: `facebook_lead_sync_log` da agência → mapa `lead_id → integration_id`
- Query 3: `leads` com `custom_fields` não nulos da agência (já existe)
- Cruzar: para cada lead, pegar o `form_name` via sync_log → integration, agrupar campos por esse nome

Campos que são `STANDARD_FIELDS` continuam filtrados. Formulários sem nome caem em "Outros".

