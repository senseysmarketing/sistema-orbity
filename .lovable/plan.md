

# Corrigir Altura do Card "Rentabilidade por Cliente"

## Problema
O `max-h-[calc(100vh-300px)]` aplicado anteriormente faz o card ficar muito grande, desalinhado com a coluna esquerda. O card deve acompanhar a altura natural do grid (alinhado ao bloco de "Fluxo de Caixa" + "Top Categorias de Custo"), permitindo scroll interno apenas dentro desse espaço.

## Solução

**`src/components/admin/CommandCenter/ClientProfitabilityCard.tsx`**:

Trocar `max-h-[calc(100vh-300px)]` por simplesmente remover o max-height do `CardContent` e aplicar `overflow-y-auto` no card inteiro com `h-full` + `flex flex-col`, fazendo o card preencher a altura do grid row sem ultrapassá-la.

Alterações:
- No `Card` raiz: adicionar `h-full flex flex-col overflow-hidden`
- No `CardContent`: trocar `max-h-[calc(100vh-300px)] overflow-y-auto` por `flex-1 overflow-y-auto min-h-0`

Isso faz o card herdar a altura da grid row (definida pela coluna esquerda) e o conteúdo rolar internamente.

## Arquivo alterado
- `src/components/admin/CommandCenter/ClientProfitabilityCard.tsx`

