

# Corrigir Scroll da Rentabilidade por Cliente

## Problema
O `CardContent` tem `max-h-[500px]` fixo, o que corta a lista de clientes no meio. Com 23 clientes ativos, muitos ficam ocultos e o corte visual acontece abruptamente.

## Solução

**`src/components/admin/CommandCenter/ClientProfitabilityCard.tsx`** (linha 53):

Remover o `max-h-[500px]` fixo e substituir por uma altura mais generosa ou usar `flex-1 overflow-y-auto` para que o scroll ocupe todo o espaço disponível do card.

Trocar:
```
className="space-y-3 max-h-[500px] overflow-y-auto"
```
Por:
```
className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto"
```

Isso faz o scroll se adaptar à altura da tela, garantindo que a lista não corte no meio e permita rolar até o último cliente.

## Arquivo alterado
- `src/components/admin/CommandCenter/ClientProfitabilityCard.tsx`

