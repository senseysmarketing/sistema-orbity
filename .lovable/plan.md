

# Gerador de Legendas - Nova aba no Social Media

## Resumo

Criar uma nova aba "Legendas" na tela de Social Media com um gerador de legendas inteligente via IA. O usuario pode selecionar uma tarefa existente (que ja traz contexto do cliente, plataforma, formato etc.) ou descrever manualmente o que precisa. A IA gera uma legenda completa com emojis, hashtags, CTA e dados do cliente (ex: telefone para contato).

## Como funciona

1. O usuario escolhe entre dois modos:
   - **A partir de uma tarefa**: Seleciona uma tarefa de redes sociais/criativos. O sistema puxa automaticamente titulo, descricao, plataforma, formato, hashtags, instrucoes criativas, e dados do cliente vinculado (nome, telefone/contato, servico).
   - **Descricao livre**: O usuario descreve o que precisa e opcionalmente seleciona um cliente para puxar os dados dele.

2. Opcoes adicionais configuráveis:
   - Tom de voz (profissional, descontraido, inspiracional, educativo)
   - Incluir CTA (sim/nao, qual tipo)
   - Incluir hashtags
   - Incluir dados de contato do cliente na legenda
   - Plataforma destino (Instagram, Facebook, LinkedIn, TikTok)

3. A IA gera a legenda e exibe em um campo de texto editavel, com botao de copiar.

4. Historico das ultimas legendas geradas fica visivel na mesma tela para reutilizacao.

## Arquivos

### Novo: `src/components/social-media/CaptionGenerator.tsx`

Componente principal da aba com:
- Toggle entre modo "Tarefa" e "Descricao livre"
- No modo Tarefa: Select que busca tarefas de redes_sociais/criativos da agencia (filtradas por status nao concluido)
- No modo livre: Textarea para descricao + Select de cliente (opcional)
- Opcoes de tom de voz, CTA, hashtags
- Botao "Gerar Legenda" que chama a IA
- Area de resultado com a legenda gerada, editavel
- Botao "Copiar" para clipboard
- Historico das ultimas legendas geradas (armazenado em estado local, sem persistencia no banco por enquanto)

### Modificado: `src/pages/SocialMedia.tsx`

- Importar `CaptionGenerator`
- Adicionar 5a aba "Legendas" com icone `Type` (lucide) no TabsList (grid-cols-5)
- Adicionar TabsContent correspondente

### Modificado: `supabase/functions/ai-assist/index.ts`

- Adicionar novo tipo `generate_caption`
- Novo tool `CAPTION_TOOLS` com schema para retornar: `caption` (string com a legenda completa), `hashtags` (array), `cta_text` (string)
- Novo prompt `DEFAULT_CAPTION_PROMPT` instruindo a IA a gerar legendas profissionais para redes sociais, usando emojis, adaptando ao tom e plataforma, e incluindo dados do cliente quando fornecidos
- Novo bloco no switch do serve para rotear o tipo `generate_caption`

### Modificado: `src/hooks/useAIAssist.tsx`

- Adicionar interface `CaptionResult` com campos `caption`, `hashtags`, `cta_text`
- Adicionar funcao `generateCaption` que chama `callAI("generate_caption", ...)`

## Dados enviados a IA

Quando baseado em tarefa, o conteudo enviado incluira:
- Titulo e descricao da tarefa
- Plataforma e formato
- Instrucoes criativas
- Hashtags existentes
- Nome do cliente, telefone/contato e servico
- Tom de voz e preferencias selecionadas

Quando livre:
- Descricao do usuario
- Dados do cliente selecionado (se houver)
- Tom de voz e preferencias

## Interface visual

```text
+--------------------------------------------------+
| Modo: [Tarefa] [Livre]                           |
|                                                  |
| Tarefa: [Select com tarefas de social media]     |
|                                                  |
| Tom de voz: [Profissional v]                     |
| Plataforma: [Instagram v]                        |
| [x] Incluir hashtags  [x] Incluir CTA           |
| [x] Incluir contato do cliente                   |
|                                                  |
| [Gerar Legenda]                                  |
|                                                  |
| --- Resultado ---                                |
| +----------------------------------------------+ |
| | Legenda gerada editavel...                   | |
| +----------------------------------------------+ |
| [Copiar]                                         |
|                                                  |
| --- Historico ---                                |
| > Legenda 1 (cliente X, 14:30)  [Copiar]        |
| > Legenda 2 (cliente Y, 14:15)  [Copiar]        |
+--------------------------------------------------+
```

## Detalhes tecnicos

- A busca de tarefas filtra por `agency_id`, `task_type IN ('redes_sociais', 'criativos')` e `status != 'done'`
- Ao selecionar uma tarefa, busca o cliente via `task_clients` (join table) e depois os dados do cliente na tabela `clients` (campos `name`, `contact`, `service`)
- O historico de legendas fica em `useState` (array), sem persistencia no banco inicialmente - pode ser adicionado depois se o usuario quiser
- A edge function recebe o contexto completo como JSON stringificado no campo `content`
