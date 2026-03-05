

# Ajustar Prompt da IA para Planejamento de Conteudo

## Problema

A IA esta gerando "legendas" no campo `description` dos itens de planejamento, sendo que este campo deveria conter a descricao do conteudo/tarefa (o que deve ser feito, contexto, objetivo). A legenda ja tem uma aba dedicada no sistema.

O campo `creative_instructions` tambem precisa ser reforçado para focar em elementos visuais e textuais da arte (headlines, CTAs, subtitulos, roteiros).

## Alteracoes

### Arquivo: `supabase/functions/ai-assist/index.ts`

**1. Prompt do sistema (linha 239)** — Remover menção a "legenda" e reforcar que `description` e a descricao da tarefa/conteudo:

```
"...Cada conteúdo deve ter título, descrição clara do que deve ser produzido, instruções criativas detalhadas (headlines, subtítulos, CTAs, textos para a arte, roteiros) e hashtags relevantes. NÃO gere legendas — a legenda é criada separadamente em outra etapa."
```

**2. Tool `extract_content_plan` (linha 144)** — Alterar description do campo `description`:

De: `"Legenda completa do post"`
Para: `"Descrição clara e objetiva do conteúdo a ser produzido: tema, abordagem, pontos principais e contexto da postagem. NÃO inclua legenda."`

**3. Tool `extract_content_plan` (linha 148)** — Melhorar description do campo `creative_instructions`:

De: `"Instrucoes detalhadas para o designer"`
Para: `"Instruções detalhadas de criação: sugestões de headline, subtítulo, CTA, textos na arte, elementos visuais. Para vídeos/reels: roteiro com pontos principais."`

**4. Tool `extract_plan_item` (linha 193)** — Mesma correção para edição de itens:

De: `"Legenda/descrição envolvente e profissional para o post"`
Para: `"Descrição clara do conteúdo a ser produzido: tema, abordagem e pontos principais. NÃO gere legenda."`

Total: 4 alterações pontuais no edge function, sem mudanças no frontend.

