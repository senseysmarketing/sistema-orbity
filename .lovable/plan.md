

# Auto-Analise IA + Layout Lado a Lado

## Resumo

Duas mudancas na secao expandida de analise de campanhas:

1. **Auto-trigger**: Ao clicar em "Analise", a analise da IA sera gerada automaticamente junto com os dados semanais (sem precisar de um segundo clique)
2. **Layout lado a lado**: Cards semanais a esquerda, analise da IA a direita, ocupando a largura total da secao

## Analise do Layout

O conteudo expandido esta dentro de um `<TableCell colSpan={9}>`, que ja ocupa a largura total da tabela. Nao ha `max-width` limitando - o `AppLayout` usa apenas `flex-1 p-4 md:p-6`. O problema e que os cards semanais e a analise IA estao empilhados verticalmente (`mt-4`). A solucao e coloca-los dentro de um `grid grid-cols-1 lg:grid-cols-2 gap-6`.

## Mudancas Tecnicas

### `src/components/traffic/CampaignsAndReports.tsx`

**1. Auto-trigger da analise IA**

Na funcao `handleWeeklyAnalysis`, apos carregar os dados semanais com sucesso, chamar automaticamente `handleAIAnalysis(campaign)`. Para isso, precisamos passar a campanha como parametro e aguardar os dados semanais.

**2. Layout lado a lado**

Reorganizar o conteudo dentro do `<TableCell>`:

```
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <!-- Esquerda: Cards semanais -->
  <div>
    <h4>Analise das Ultimas Semanas</h4>
    <div class="grid grid-cols-2 gap-3">
      ...cards...
    </div>
  </div>
  
  <!-- Direita: Analise IA -->
  <div>
    <h5>Analise da IA</h5>
    ...conteudo ou loading...
  </div>
</div>
```

Os cards semanais passam de `grid-cols-4` para `grid-cols-2` (ja que agora ocupam metade da largura).

O botao "Analisar com IA" sera removido pois a analise ja sera disparada automaticamente.

## Arquivo Modificado

| Arquivo | Descricao |
|---|---|
| `src/components/traffic/CampaignsAndReports.tsx` | Auto-trigger IA + layout grid lado a lado |

