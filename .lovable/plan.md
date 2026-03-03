

# Corrigir Scroll Vertical no Modal de Planejamento

## Problema

Em monitores menores, o step 2 (Frequencia) do wizard corta campos porque o `ScrollArea` nao tem a restricao `min-h-0` necessaria para o flexbox ativar o scroll corretamente.

## Solucao

Aplicar o padrao flexbox correto: envolver o `ScrollArea` com `div className="flex-1 min-h-0"` para que o conteudo encolha e o scroll ative automaticamente.

### Arquivo: `src/components/social-media/planning/ContentPlanWizard.tsx`

- Linha 477: Envolver o `ScrollArea` com um wrapper `<div className="flex-1 min-h-0">` e remover `flex-1` do proprio ScrollArea
- Isso segue o padrao ja documentado do projeto para modais com scroll

Alteracao minima -- apenas 2 linhas afetadas.

