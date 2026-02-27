

# Funil de Vendas Estilo 3D com Layout em Dois Blocos

## Resumo

Redesenhar o funil de vendas para ter um visual 3D similar a imagem de referencia (com efeito de profundidade/perspectiva nas barras) e dividir o card em dois blocos lado a lado: funil centralizado a esquerda e metricas de conversao a direita.

## Layout

```text
+----------------------------------+----------------------------------+
|                                  |                                  |
|     FUNIL DE VENDAS (3D)         |   CONVERSOES ENTRE ETAPAS        |
|                                  |                                  |
|      ____________________        |   Leads -> Em contato    14.0%   |
|     /                    \       |   Em contato -> Qual.    62.5%   |
|    /      Leads (57)      \      |   Qual. -> Agend.       100.0%  |
|   /________________________\     |   Agend. -> Reun.       100.0%  |
|     /                  \         |   Reun. -> Prop.         80.0%  |
|    /   Em contato (8)   \        |   Prop. -> Vendas        50.0%  |
|   /____________________\         |                                  |
|       ...                        |   --- BENCHMARKS ---             |
|         ___                      |   Lead->Venda  | Lead->Contato  |
|        / V \                     |   Prop.->Venda |                 |
|        \___/                     |                                  |
|                                  |   --- NO-SHOW ---                |
+----------------------------------+----------------------------------+
```

Em mobile, os blocos empilham verticalmente (funil em cima, metricas embaixo).

## Visual 3D do Funil

Inspirado na imagem de referencia, cada etapa tera:
- Efeito de "borda inferior curva" usando `border-radius` na parte inferior para simular profundidade 3D
- Sombra interna sutil (`box-shadow: inset`) para dar volume
- Gap entre as etapas (como na imagem) em vez de coladas
- A ultima etapa (Vendas) tera formato de triangulo invertido (ponta para baixo)
- Degrade roxo mantido (do escuro ao claro, com verde no final)

## Detalhes Tecnicos

### Arquivo: `src/components/crm/CRMFunnelChart.tsx`

**1. Layout em grid de 2 colunas**

Substituir o layout atual (tudo empilhado) por `grid grid-cols-1 lg:grid-cols-2 gap-6`:
- Coluna esquerda: funil visual 3D centralizado
- Coluna direita: taxas de conversao entre etapas, benchmarks e no-show indicator

**2. Funil com efeito 3D**

Cada barra do funil tera:
- `clip-path` trapezoidal (mantido)
- Pseudo-elemento inferior com `border-radius: 0 0 50% 50%` para criar a curvatura 3D
- Implementado via um div extra abaixo de cada barra com cor mais escura e `border-radius` arredondado
- Gap de 4-6px entre as etapas para dar "respiro" visual como na imagem
- Ultima etapa com clip-path triangular (ponta para baixo)

**3. Coluna direita - Metricas organizadas**

- Conversoes entre etapas listadas verticalmente (em vez de horizontal com scroll)
- Cada linha mostra: "Etapa A -> Etapa B" com a porcentagem e uma barra de progresso sutil
- Benchmarks abaixo com separador
- No-show indicator no final

**4. Responsividade**

- Desktop (lg+): 2 colunas lado a lado
- Mobile: empilha verticalmente, funil primeiro

### Arquivo modificado

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/crm/CRMFunnelChart.tsx` | Funil 3D + layout 2 colunas |

