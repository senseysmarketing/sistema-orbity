

# Melhorias no Dialog de Edicao de Conteudo do Planejamento

## Resumo

Tres ajustes no `ContentPlanItemEditDialog`:

1. **Bug da plataforma**: O Select de plataforma nao carrega o valor salvo porque os valores no banco podem estar em minusculo (ex: "instagram") enquanto as opcoes do Select sao capitalizadas ("Instagram"). Corrigir normalizando o valor.

2. **Titulo dinamico**: Quando o item e novo (`id === "__new__"`), exibir "Adicionar conteudo" em vez de "Editar conteudo".

3. **Botao de IA**: Adicionar um botao "IA" a esquerda de "Cancelar" no footer. Ao clicar, expande um campo de texto para direcionamento (opcional). Ao confirmar:
   - **Modo edicao** (item existente): A IA recebe o conteudo atual + direcionamento + contexto dos demais itens do plano e gera uma versao melhorada, preenchendo todos os campos do formulario.
   - **Modo adicionar** (item novo): A IA recebe o contexto dos itens existentes do plano + direcionamento e gera um conteudo novo coerente com a estrategia.

## Detalhes Tecnicos

### 1. `ContentPlanItemEditDialog.tsx`

**Props adicionais:**
- `planItems?: ContentPlanItem[]` -- lista dos outros itens do plano (para contexto da IA)
- `planStrategy?: string` -- resumo da estrategia do plano (campo `ai_response.strategy_summary`)

**Mudancas:**
- Titulo dinamico: `item?.id === "__new__" ? "Adicionar conteudo" : "Editar conteudo"`
- Fix plataforma: normalizar o valor com `item.platform?.charAt(0).toUpperCase() + item.platform?.slice(1).toLowerCase()` ou buscar match case-insensitive na lista PLATFORMS
- Estado `showAIInput` (boolean) e `aiDirection` (string)
- Botao com icone de Sparkles no footer, a esquerda de Cancelar
- Ao clicar no botao IA, aparece um campo de texto colapsavel acima do footer com placeholder "Descreva o direcionamento (opcional)..." e um botao "Gerar com IA"
- A chamada usa `supabase.functions.invoke("ai-assist")` com um novo type `edit_plan_item` que retorna os campos de um unico item

### 2. `supabase/functions/ai-assist/index.ts`

**Novo type: `edit_plan_item`**

- **Tool**: `extract_plan_item` -- retorna um unico item com campos: title, description, format, platform, content_type, creative_instructions, objective, hashtags, post_date
- **Prompt**: "Voce e um estrategista de conteudo. Gere ou melhore um unico item de planejamento de conteudo para redes sociais. Considere o contexto dos demais conteudos ja planejados para manter coerencia e nao repetir temas."
- Instrucoes tecnicas: formato dos campos, plataformas validas, responder em PT-BR, distribuir formatos equilibradamente

**Nova constante de tools:**
```
EDIT_PLAN_ITEM_TOOLS = [{
  type: "function",
  function: {
    name: "extract_plan_item",
    parameters: {
      properties: {
        title, description, format, platform, content_type,
        creative_instructions, objective, hashtags, post_date
      }
    }
  }
}]
```

### 3. `ContentPlanDetailsSheet.tsx`

Passar `planItems` e `planStrategy` para o `ContentPlanItemEditDialog`:

```
<ContentPlanItemEditDialog
  item={editingItem}
  planItems={items}
  planStrategy={plan.ai_response?.strategy_summary}
  ...
/>
```

### 4. `useContentPlanning.tsx` (ou inline no dialog)

Nao precisa de mudancas no hook -- a chamada `supabase.functions.invoke("ai-assist")` sera feita diretamente no dialog.

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/social-media/planning/ContentPlanItemEditDialog.tsx` | Titulo dinamico, fix plataforma, botao IA com campo de direcionamento |
| `src/components/social-media/planning/ContentPlanDetailsSheet.tsx` | Passar planItems e planStrategy ao dialog |
| `supabase/functions/ai-assist/index.ts` | Novo type `edit_plan_item` com tool e prompt dedicados |

