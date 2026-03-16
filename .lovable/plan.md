

# Simplificar Webhook de Captura de Leads

## Problemas Atuais

1. **UI muito complexa**: Mapeamento de campos editável é confuso para o usuário — na prática ninguém altera esses valores. O bloco ocupa metade da tela com 8 inputs que quase nunca mudam.

2. **Campos customizados não são qualificados**: O `capture-lead` salva dados extras em `custom_fields.original_data` (aninhado), mas o `process-lead-qualification` espera campos diretamente em `custom_fields`. Resultado: leads vindos do webhook **nunca são qualificados**.

3. **Status Padrão é um input de texto livre**: O usuário precisa digitar o slug correto (ex: `leads`). Deveria ser um Select com os estágios do pipeline.

4. **Temperatura Padrão é irrelevante**: O sistema de qualificação automático define a temperatura com base em scoring. Mostrar seleção manual de temperatura confunde.

5. **Exemplos de código ocupam muito espaço**: Bloco de exemplos com 3 tabs (JS, cURL, HTML) poderia ser colapsável ou integrado ao guia de download.

## Plano

### 1. Simplificar a UI do `WebhooksManager.tsx`
- **Remover** o bloco de mapeamento de campos (manter valores padrão hardcoded no backend)
- **Remover** seleção de Temperatura Padrão (qualificação automática cuida disso)
- **Substituir** input de Status Padrão por um `Select` com os estágios do pipeline (usando `useLeadStatuses`)
- **Manter** URL, botão copiar, estatísticas, testar webhook, guia download
- **Tornar** exemplos de código colapsáveis (Collapsible/Accordion)
- Layout mais limpo e compacto

### 2. Atualizar `capture-lead/index.ts`
- Salvar campos extras (que não são name/email/phone/company/etc.) **diretamente** em `custom_fields` (flat, não aninhado em `original_data`) — compatível com o scoring engine
- Após criar o lead, **chamar `process-lead-qualification`** para qualificar automaticamente (mesmo padrão do `facebook-leads`)
- Remover dependência de `agency_webhooks.headers.field_mapping` — usar mapeamento fixo (simplificação)
- Manter leitura de `default_values` do webhook config para status e source

### 3. Manter compatibilidade
- O edge function continua aceitando os mesmos payloads (POST JSON, form-urlencoded, GET params)
- O mapeamento padrão (name→name, email→email, etc.) é mantido hardcoded
- Campos não reconhecidos vão para `custom_fields` para qualificação

### Arquivos Modificados
- `src/components/crm/WebhooksManager.tsx` — UI simplificada
- `supabase/functions/capture-lead/index.ts` — flat custom_fields + trigger qualificação

