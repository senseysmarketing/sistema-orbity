

# Fix: Editar Lead Apaga Respostas do Formulário e Qualificação

## Problema
Na linha 148 de `LeadForm.tsx`, o `leadData` sempre define `custom_fields: {}`. Ao salvar, isso sobrescreve os dados originais (respostas do formulário Meta/Webhook, dados de qualificação) com um objeto vazio.

## Solução

### `src/components/crm/LeadForm.tsx`

**Preservar `custom_fields` existentes ao editar:**
- Linha 148: trocar `custom_fields: {}` por `custom_fields: lead?.custom_fields || {}`
- Isso mantém as respostas do formulário e dados de qualificação intactos durante a edição

**Uma única linha alterada.** Nenhum outro arquivo precisa ser modificado.

