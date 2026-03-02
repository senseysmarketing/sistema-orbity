
# Corrigir CONTENT_PLANNING_TOOLS vazio na Edge Function

## Problema

O array `CONTENT_PLANNING_TOOLS` no arquivo `supabase/functions/ai-assist/index.ts` (linhas 125-127) esta vazio -- contendo apenas um comentario placeholder `// ... keep existing code` de uma edicao anterior. Isso faz com que a chamada ao AI gateway falhe porque o `toolChoice` referencia a funcao `extract_content_plan` que nao existe no array de tools enviado.

## Solucao

Reconstruir o `CONTENT_PLANNING_TOOLS` com a definicao completa da funcao `extract_content_plan`, que deve gerar um plano de conteudo mensal estruturado.

### Arquivo: `supabase/functions/ai-assist/index.ts`

Substituir as linhas 125-127 pela definicao completa do tool:

```typescript
const CONTENT_PLANNING_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "extract_content_plan",
      description: "Gere um planejamento mensal de conteudo para redes sociais.",
      parameters: {
        type: "object",
        properties: {
          plan_title: { type: "string", description: "Titulo do planejamento" },
          strategy_summary: { type: "string", description: "Resumo da estrategia do mes" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day_number: { type: "number" },
                post_date: { type: "string", description: "Data no formato YYYY-MM-DD" },
                title: { type: "string" },
                description: { type: "string", description: "Legenda completa do post" },
                content_type: { type: "string" },
                format: { type: "string", enum: ["carrossel", "feed", "reels", "stories", "video"] },
                platform: { type: "string" },
                creative_instructions: { type: "string", description: "Instrucoes detalhadas para o designer" },
                objective: { type: "string" },
                hashtags: { type: "string", description: "Hashtags separadas por espaco, cada uma com #" },
              },
              required: ["day_number", "post_date", "title", "description", "content_type", "format", "platform", "creative_instructions", "objective", "hashtags"],
            },
          },
        },
        required: ["plan_title", "strategy_summary", "items"],
        additionalProperties: false,
      },
    },
  },
];
```

### Deploy

Apos a alteracao, a edge function precisa ser redeployada para que a correcao tenha efeito.

## Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/ai-assist/index.ts` | Reconstruir CONTENT_PLANNING_TOOLS com a definicao completa do tool extract_content_plan |
