

# Variáveis de Formulário Meta nos Templates WhatsApp

## Contexto

Os leads do Facebook já têm as respostas do formulário salvas em `custom_fields` (JSONB) na tabela `leads`. Campos padrão (full_name, email, phone_number, etc.) são separados dos campos personalizados (perguntas do formulário). Precisamos disponibilizar essas respostas como variáveis nos templates de WhatsApp.

## O que será feito

1. **Nova variável dinâmica `{{formulario:campo}}`** — permitir referenciar qualquer campo do `custom_fields` do lead nos templates de mensagem. Exemplo: `{{formulario:qual_o_seu_vgv_mensal}}` será substituído pela resposta do lead.

2. **Seletor visual de variáveis no editor de template** — ao editar um template, mostrar um dropdown/lista de variáveis disponíveis (fixas + dinâmicas do formulário) para inserir no texto com um clique.

3. **Buscar campos disponíveis dos formulários** — consultar os `custom_fields` dos leads existentes da agência para listar as perguntas de formulário disponíveis como variáveis.

## Alterações

### 1. `supabase/functions/process-whatsapp-queue/index.ts`
- Na linha 202, expandir o `select` para incluir `custom_fields`
- Após substituir as variáveis fixas (nome, email, etc.), adicionar loop que substitui `{{formulario:CAMPO}}` pelo valor correspondente em `custom_fields`
- Aplicar `formatAnswer` (limpeza de underscores) no valor

### 2. `src/components/crm/WhatsAppTemplateManager.tsx`
- Atualizar a descrição de variáveis disponíveis para incluir a sintaxe `{{formulario:campo}}`
- Adicionar um componente `VariableInserter` no `TemplateEditor` — um botão/popover que lista:
  - **Variáveis fixas**: `{{nome}}`, `{{empresa}}`, `{{email}}`, `{{telefone}}`
  - **Variáveis de formulário**: buscadas dinamicamente dos `custom_fields` dos leads da agência
- Ao clicar numa variável, ela é inserida no textarea

### 3. Novo hook/query para buscar campos disponíveis
- Query que faz `SELECT DISTINCT jsonb_object_keys(custom_fields)` dos leads da agência com `source = 'facebook_leads'`
- Filtra os `STANDARD_FIELDS` (full_name, email, etc.) para mostrar apenas perguntas do formulário
- Formata os nomes para exibição amigável (reutilizando lógica de `formatQuestion`)

## Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/process-whatsapp-queue/index.ts` | Substituir variáveis `{{formulario:X}}` |
| `src/components/crm/WhatsAppTemplateManager.tsx` | Adicionar seletor de variáveis e docs |

## Exemplo de uso

Template configurado:
> Olá {{nome}}! Vi que você tem interesse em {{formulario:qual_o_seu_vgv_mensal}}. Podemos conversar?

Resultado enviado:
> Olá João! Vi que você tem interesse em Menos de R$ 500.000. Podemos conversar?

