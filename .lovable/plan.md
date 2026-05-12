## Problema

O "Editor" do Estúdio de Criação usa o **TipTap (RichTextEditor)**, que é um editor visual (WYSIWYG). Quando você cola o código-fonte de um e-mail HTML completo (`<!doctype html>`, `<table>`, estilos inline, etc.), o TipTap trata isso como **texto puro** e escapa as tags. Resultado:

- O `campaign.body` salvo fica como `&lt;!doctype html&gt;...` (texto literal, não HTML real).
- A "Visualização" usa `dangerouslySetInnerHTML`, então renderiza esse texto escapado — aparece como uma parede de tags em vez do design final.
- Mesmo que conseguisse interpretar, o TipTap remove `<table>`, atributos de estilo inline e a estrutura típica de e-mail HTML, que são justamente o que esses templates precisam.

Ou seja: o comportamento atual é uma limitação do editor visual, não um bug do preview.

## Solução proposta

Adicionar um **terceiro modo "Código HTML"** ao lado de Editor e Visualização, e tratar HTML colado de forma inteligente.

### 1. Novo toggle de modo no `CampaignBuilder`

Trocar o `ToggleGroup` atual (Editor / Visualização) por três opções:

```
[ </> Visual ]  [ {} HTML ]  [ 👁 Visualização ]
```

- **Visual** → TipTap atual (texto rico simples, ideal para e-mails escritos do zero).
- **HTML** → `<textarea>` em fonte monoespaçada, ligado diretamente a `campaign.body`. É aqui que o usuário cola o HTML completo do template.
- **Visualização** → mantém o `dangerouslySetInnerHTML` que já existe, agora renderizando o HTML real.

Estado: estender `campaignView` para `"visual" | "html" | "preview"` (atualizar `EmailMarketing.tsx` onde for declarado).

### 2. Detecção automática de HTML colado no modo Visual

No `RichTextEditor`, adicionar um `editorProps.handlePaste` que:

- Lê `clipboardData.getData('text/plain')`.
- Se o texto começar com `<!doctype`, `<html`, `<table` ou contiver mais de N tags, mostra um `toast` perguntando *"Detectamos código HTML. Deseja colar como HTML?"* e, ao confirmar, troca o modo para **HTML** e escreve o conteúdo bruto em `campaign.body`.
- Caso contrário, deixa o paste padrão do TipTap acontecer.

### 3. Sincronização entre modos

- Modo **Visual → HTML**: `campaign.body` já é HTML gerado pelo TipTap, então a textarea exibe naturalmente.
- Modo **HTML → Visual**: avisar (toast informativo) que o TipTap pode simplificar tags complexas (tabelas, estilos inline) — opcional, mas evita confusão.
- A **Visualização** sempre usa `campaign.body`, sem transformação.

### 4. UI da textarea HTML

- `font-mono text-xs`, altura mínima ~500px, scroll vertical.
- Pequeno rodapé com a contagem de caracteres e um botão "Formatar" (opcional, pode ficar para depois).
- Mesmo container/Card já usado pelo editor para manter consistência visual.

## Arquivos afetados

- `src/components/email-marketing/CampaignBuilder.tsx` — novo toggle de 3 modos, textarea HTML, ajuste do render condicional.
- `src/pages/EmailMarketing.tsx` — atualizar o tipo/estado `campaignView` para incluir `"html"`.
- `src/components/ui/rich-text-editor.tsx` — `handlePaste` com detecção de HTML e callback opcional `onPasteHTML?: (html: string) => void` para o pai trocar de modo.

## Fora de escopo

- Não vamos trocar o TipTap por um editor de blocos drag-and-drop (Unlayer/MJML) — isso seria uma refatoração grande, fica para um próximo passo se você quiser.
- Não vamos sanitizar/reescrever o HTML colado; ele vai para o preview e para o envio exatamente como você colou.