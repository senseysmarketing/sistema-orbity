

# Agrupar Campos de Formulário por Nome do Formulário

## Problema

Atualmente, o seletor de variáveis lista todos os campos de `custom_fields` de todos os leads misturados, incluindo campos de formulários antigos que não são mais usados. Isso causa confusão e risco de puxar variáveis vazias.

## Solução

Agrupar os campos por `form_name` (que já existe dentro de `custom_fields` de cada lead). O seletor mostrará seções separadas por formulário, ex:

```text
Variáveis fixas
  [Nome] [Empresa] [Email] [Telefone]

📋 Formulário: "Captação Imóveis 2025"
  [O Custo Do Nosso Trabalho...] [Qual O Seu VGV Mensal?]

📋 Formulário: "Lead Magnet Antigo"
  [Qual Seu Instagram?] [Principal Gargalo...]
```

## Alterações

### `src/components/crm/WhatsAppTemplateManager.tsx`

1. **Modificar `useFormFieldKeys`** — em vez de retornar `string[]`, retornar `Record<string, string[]>` (mapa de `form_name → campos[]`):
   - Ao iterar os `custom_fields`, extrair `form_name` de cada lead
   - Agrupar os campos não-padrão por esse `form_name`
   - Leads sem `form_name` vão para um grupo "Outros"

2. **Atualizar `VariableInserter`** — receber o mapa agrupado e renderizar uma seção por formulário com:
   - Título do formulário como header
   - Badges dos campos abaixo
   - Scroll vertical para acomodar múltiplos formulários

3. **Propagar tipo atualizado** — ajustar props de `TemplatePhaseSection` e `TemplateEditor` para o novo tipo `Record<string, string[]>`.

Arquivo único: `src/components/crm/WhatsAppTemplateManager.tsx`

