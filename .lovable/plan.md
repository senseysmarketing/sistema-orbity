

# Corrigir Layout do Modal de Planejamento

## Problema

O `DialogContent` usa `max-h-[90vh]` mas nao tem `h-[90vh]`, entao o flex container nao tem altura fixa para distribuir. O `flex-1` do wrapper do ScrollArea nao consegue calcular quanto espaco ocupar, fazendo o conteudo e os botoes se sobreporem.

## Solucao

Duas alteracoes no `ContentPlanWizard.tsx`:

1. **Linha 467**: Trocar `max-h-[90vh]` por `h-[90vh]` no `DialogContent` para dar altura fixa ao flex container
2. **Linha 484**: Adicionar `shrink-0` ao footer para garantir que os botoes nunca sejam comprimidos

Isso segue o padrao flexbox documentado do projeto: container com altura definida + `min-h-0` no wrapper + `shrink-0` no footer.

