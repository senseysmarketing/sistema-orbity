
# Preenchimento Inteligente para Tarefas e Posts

## Resumo

Ao clicar em "Nova Tarefa" ou "Novo Post", em vez de abrir diretamente o formulario, abre uma tela intermediaria de **Preenchimento Inteligente** inspirada no print de referencia. O usuario descreve o que precisa (digitando ou por audio) e a IA pre-preenche todos os campos automaticamente. Ele tambem pode pular e preencher manualmente.

## Fluxo do Usuario

```text
Clica "Nova Tarefa"
  -> Abre Dialog com tela de Preenchimento Inteligente
     -> Duas abas: "Digitar" | "Gravar Audio"
     -> Textarea com placeholder contextual
     -> Botao "Preencher com IA" (primario, com icone Sparkles)
     -> Link "Pular e preencher manualmente" (texto discreto)
  
  Se clica "Preencher com IA":
     -> Loading com animacao
     -> IA retorna JSON estruturado (titulo, descricao, prioridade, tipo)
     -> Pre-preenche o formulario e avanca para a tela de formulario normal
  
  Se clica "Pular e preencher manualmente":
     -> Avanca direto para o formulario vazio (comportamento atual)
```

O mesmo fluxo se aplica ao PostFormDialog.

## Arquitetura

### Edge Function: `ai-assist`

Uma unica edge function com modos de operacao via campo `type`:

- **`prefill_task`**: Recebe texto livre, retorna JSON com title, description, priority, task_type (via tool calling)
- **`prefill_post`**: Recebe texto livre, retorna JSON com title, description, platform, post_type, hashtags
- **`enhance_description`**: (futuro) Melhora texto existente

Usa Lovable AI Gateway (`google/gemini-3-flash-preview`) com tool calling para extrair dados estruturados.

### Componente: `AIPreFillStep`

Componente reutilizavel que renderiza a tela intermediaria:
- Props: `type` ("task" | "post"), `onResult` (callback com dados), `onSkip` (pular), `loading`
- Tabs "Digitar" e "Gravar Audio" usando estado interno
- Web Speech API (PT-BR) para transcricao por voz no navegador
- Indicador visual de gravacao (pulso vermelho no botao do microfone)
- Oculta aba de audio se navegador nao suportar Web Speech API

### Hook: `useAIAssist`

Hook centralizado para chamadas a edge function:
- `preFillTask(text)` -> retorna `{ title, description, priority, task_type }`
- `preFillPost(text)` -> retorna `{ title, description, platform, post_type, hashtags }`
- Estados: `loading`, `error`
- Tratamento de erros 429 (rate limit) e 402 (creditos) com toast amigavel

## Mudancas por Arquivo

| Arquivo | Operacao | Descricao |
|---|---|---|
| `supabase/functions/ai-assist/index.ts` | Criar | Edge function com Lovable AI Gateway e tool calling |
| `supabase/config.toml` | Editar | Adicionar config da funcao ai-assist + restaurar configs anteriores |
| `src/hooks/useAIAssist.tsx` | Criar | Hook para chamadas IA |
| `src/components/ui/ai-prefill-step.tsx` | Criar | Tela de preenchimento inteligente (digitar/audio) |
| `src/pages/Tasks.tsx` | Editar | Adicionar estado de step (prefill vs form), renderizar AIPreFillStep antes do formulario |
| `src/components/social-media/PostFormDialog.tsx` | Editar | Mesmo padrao: step intermediario antes do formulario |

## Detalhes Tecnicos

### Edge Function - Tool Calling para Tarefas

```text
Tool: extract_task_data
Parameters:
  - title (string, required)
  - description (string, required) 
  - priority (enum: low, medium, high)
  - suggested_type (string) - sugestao de tipo baseado no contexto

System prompt:
"Voce e um assistente de agencia de marketing digital. 
Extraia os dados estruturados de uma tarefa a partir da descricao do usuario.
Gere um titulo conciso e uma descricao profissional, estruturada e sem erros de gramatica.
Responda sempre em portugues brasileiro."
```

### Edge Function - Tool Calling para Posts

```text
Tool: extract_post_data  
Parameters:
  - title (string, required)
  - description (string, required) - legenda/caption do post
  - platform (enum: instagram, facebook, linkedin, twitter, tiktok, youtube)
  - post_type (enum: feed, stories, reels, carrossel, video)
  - hashtags (array of strings)

System prompt:
"Voce e um social media manager profissional.
Extraia os dados de um post para redes sociais a partir da descricao do usuario.
Gere uma legenda envolvente, profissional e adaptada para a plataforma sugerida.
Inclua hashtags relevantes. Responda em portugues brasileiro."
```

### Web Speech API

```text
- Usa window.SpeechRecognition ou webkitSpeechRecognition
- Configuracao: lang="pt-BR", continuous=true, interimResults=true
- Exibe texto parcial enquanto o usuario fala
- Ao parar, texto final vai para o textarea
- Botao alterna entre "iniciar" e "parar" gravacao
- Fallback: oculta aba de audio se API indisponivel
```

### Fluxo no Dialog de Tarefas (Tasks.tsx)

O dialog de criacao ganha um estado `step`:
- `step = "prefill"`: mostra AIPreFillStep
- `step = "form"`: mostra formulario atual

Quando o usuario clica "Preencher com IA" e recebe resultado, os dados sao aplicados ao `newTask` e `step` muda para `"form"`. Quando clica "Pular", muda direto para `"form"` com campos vazios.

Ao fechar o dialog, `step` reseta para `"prefill"`.

Nota: o fluxo de template e quicktemplate continua funcionando como antes (abre direto no form).

### Fluxo no PostFormDialog

Mesmo conceito: quando `editPost` e null (criacao), mostra step de prefill primeiro. Em edicao, vai direto ao formulario.

### Restauracao do config.toml

O config.toml precisa ser restaurado com todas as configuracoes anteriores de funcoes que foram perdidas no ultimo diff, alem de adicionar a nova funcao `ai-assist`.
