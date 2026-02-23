
# Campo "Instruções de Arte" nos Posts

## Resumo

Adicionar um novo campo **"Instruções de Arte"** nos posts de social media. O campo serve para orientar o designer/editor sobre o que deve conter na arte ou vídeo: headlines, subtítulos, CTAs, textos de apoio, ou um mini roteiro para vídeos. A IA preencherá esse campo automaticamente no prefill, e o prompt pode ser personalizado por agência.

## O que muda para o usuário

- O label "Legenda/Texto" passa a ser apenas **"Legenda"**
- Novo campo **"Instruções de Arte"** aparece logo abaixo da Legenda, com um placeholder explicativo
- No wizard de criação (passo 2 - Básico), o campo aparece entre Legenda e Plataforma/Tipo
- No formulário de edição, aparece no mesmo local
- Na revisão (passo 5), o campo é exibido no resumo
- A IA preenche automaticamente com sugestões de headlines, CTAs, roteiro, etc., adaptadas ao tipo de conteúdo (feed, reels, carrossel, vídeo)

## Mudanças Técnicas

### 1. Migração de banco de dados

Adicionar coluna `creative_instructions` (text, nullable) na tabela `social_media_posts`:

```text
ALTER TABLE social_media_posts ADD COLUMN creative_instructions text;
```

### 2. Edge Function `ai-assist` - Campo `creative_instructions` no POST_TOOLS

Adicionar o campo `creative_instructions` no tool `extract_post_data`:
- Descrição: "Sugestões de criação para a arte ou vídeo. Inclua headlines, subtítulos, CTAs, textos de apoio. Para vídeos, inclua um mini roteiro com os pontos principais."

Atualizar o `DEFAULT_POST_PROMPT` para instruir a IA a gerar as instruções de arte adaptadas ao tipo de conteúdo.

### 3. `PostFormDialog.tsx`

- Adicionar `creative_instructions` ao `formData`
- Renomear label "Legenda/Texto" para "Legenda"
- Adicionar campo "Instruções de Arte" (Textarea) no passo 2 do wizard e no formulário de edição
- Incluir no resultado do AI prefill: `creative_instructions: result.creative_instructions`
- Incluir na revisão (passo 5)
- Incluir no `handleSubmit` para salvar no banco

### 4. `useAIAssist.tsx` - Atualizar interface

Adicionar `creative_instructions?: string` na interface `PostPrefillResult`.

### 5. Componentes de visualização

Exibir o campo "Instruções de Arte" no `PostDetailsDialog.tsx` e no `PostCard.tsx` (se houver espaço, apenas no details dialog).

## Arquivos Modificados

| Arquivo | Operação | Descrição |
|---|---|---|
| Migração SQL | Criar | Adicionar coluna `creative_instructions` |
| `supabase/functions/ai-assist/index.ts` | Editar | Adicionar campo no POST_TOOLS e atualizar prompt |
| `src/components/social-media/PostFormDialog.tsx` | Editar | Novo campo no formulário e wizard |
| `src/hooks/useAIAssist.tsx` | Editar | Adicionar campo na interface |
| `src/components/social-media/PostDetailsDialog.tsx` | Editar | Exibir instruções de arte |
| `src/hooks/useSocialMediaPosts.tsx` | Verificar | Garantir que o campo é salvo/lido |
