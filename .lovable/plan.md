
# Funil de Vendas com Design Custom em CSS (Degrade Roxo)

## Resumo

Substituir o componente `FunnelChart` do Recharts (que tem visual limitado e dificil de estilizar) por um **funil custom feito com HTML/CSS puro**. O novo funil tera:

- Formato trapezoidal classico de funil, com cada etapa mais estreita que a anterior
- Degrade roxo do sistema (do roxo escuro `#1c102f` da sidebar ate tons mais claros)
- Labels com nome da etapa, quantidade e taxa de conversao integrados
- Hover interativo com tooltip
- Animacao suave de entrada
- Totalmente responsivo

## O que muda visualmente

- Em vez do grafico Recharts (que renderiza um SVG generico meio "achatado"), teremos barras trapezoidais empilhadas verticalmente com `clip-path` para criar o efeito de funil
- Cada barra tem uma cor em degrade roxo: topo mais escuro, base (Vendas) em verde esmeralda
- A largura de cada barra diminui proporcionalmente (100% no topo, menor na base)
- Informacoes (nome, quantidade, taxa) ficam diretamente sobre cada barra
- O visual fica moderno, limpo e alinhado com a identidade visual roxa do sistema

## Paleta de cores do funil

```text
Leads         -> #6C3FA0  (roxo vibrante)
Em contato    -> #7E4DB8  (roxo medio)
Qualificados  -> #9061C9  (roxo claro)
Agendamentos  -> #A478D8  (lavanda)
Reunioes      -> #B88FE3  (lavanda claro)
Propostas     -> #CBA6ED  (lilas)
Vendas        -> #22c55e  (verde - destaque de sucesso)
```

## Detalhes Tecnicos

### Arquivo: `src/components/crm/CRMFunnelChart.tsx`

**1. Remover dependencia do Recharts FunnelChart**

Remover imports de `FunnelChart`, `Funnel`, `LabelList`, `ResponsiveContainer`, `Tooltip` do recharts.

**2. Substituir o bloco SVG por funil CSS custom**

Cada etapa do funil sera um `div` com:
- Largura proporcional (ex: primeiro = 100%, ultimo = ~30%)
- `clip-path: polygon(...)` para criar formato trapezoidal
- Background com a cor correspondente do degrade roxo
- Transicao suave no hover (leve expansao e sombra)
- Label centralizado com nome + quantidade + taxa de conversao

**3. Manter toda a logica de calculo existente**

Os `useMemo` de `funnelData`, `generalConversionRate`, `noShowData` e `benchmarks` permanecem identicos. Apenas a renderizacao visual muda.

**4. Manter secoes inferiores intactas**

As secoes de No-Show indicator, conversion rates entre etapas e benchmarks continuam exatamente como estao.

### Estrutura do funil custom

```text
+--------------------------------------------------+
|              Leads (57) - 100%                    |   <- largura 100%
+--------------------------------------------------+
    +------------------------------------------+
    |        Em contato (8) - 14.0%            |       <- largura ~85%
    +------------------------------------------+
        +----------------------------------+
        |     Qualificados (5) - 62.5%     |           <- largura ~72%
        +----------------------------------+
            +--------------------------+
            |  Agendamentos (5) - 100% |               <- largura ~59%
            +--------------------------+
                +--------------------+
                | Reunioes (5) - 100%|                  <- largura ~46%
                +--------------------+
                    +--------------+
                    |Propostas (4) |                    <- largura ~33%
                    +--------------+
                        +--------+
                        |Vendas 2|                      <- largura ~25%
                        +--------+
```

Cada barra tem um `margin: 0 auto` para centralizar e `border-radius` sutil nas bordas.

### Arquivo modificado

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/crm/CRMFunnelChart.tsx` | Substituir Recharts FunnelChart por funil CSS custom com degrade roxo |
