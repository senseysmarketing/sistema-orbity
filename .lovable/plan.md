

# Fix: Posicao do icone de lixeira

## Problema
O botao de lixeira esta posicionado **depois** do badge "Inativo". O usuario quer que fique **antes** (ao lado esquerdo do badge).

## Solucao

### `src/components/admin/CommandCenter/ClientManagementSheet.tsx`
- Mover o bloco `{!client.active && (<Button>...</Button>)}` (linhas 186-195) para **antes** do `<Badge>` (linha 180)
- Ordem final: `[Avatar] [Nome+Valor] [Lixeira] [Badge] [Switch]`

