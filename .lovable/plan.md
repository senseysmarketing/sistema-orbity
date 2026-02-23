

# Corrigir Largura da Seção de Análise

## Problema

A seção expandida de análise está dentro de um `<TableCell colSpan={9}>`. Embora tecnicamente ocupe todas as colunas, a largura é limitada pela largura renderizada da tabela, que é determinada pelo conteúdo das 9 colunas (nomes curtos, valores numéricos pequenos). O `<table>` HTML não expande além do necessário para seu conteúdo, mesmo com `w-full`.

## Solução

Mover o conteúdo expandido (cards semanais + análise IA) para **fora da tabela**, renderizando-o como um bloco separado abaixo da `<Table>`. Quando uma campanha é expandida, o bloco aparece entre a tabela e o restante do conteúdo, ocupando 100% da largura do `CardContent`.

A tabela continua exibindo as linhas das campanhas normalmente. O `Collapsible` com o conteúdo de análise passa a ser renderizado fora do `<Table>`, como um `<div>` irmão.

## Mudança Técnica

### `src/components/traffic/CampaignsAndReports.tsx`

**Estrutura atual (simplificada):**
```text
CardContent
  Table
    TableBody
      map(campaigns =>
        TableRow (dados da campanha + botão Análise)
        Collapsible > TableRow > TableCell colSpan=9
          grid (cards + IA)   <-- PRESO na largura da tabela
      )
```

**Estrutura nova:**
```text
CardContent
  Table
    TableBody
      map(campaigns =>
        TableRow (dados da campanha + botão Análise)
      )
  
  {expandedCampaign && (
    <div className="w-full border-t bg-muted/50 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
        <div>Cards semanais</div>
        <div>Análise IA</div>
      </div>
    </div>
  )}
```

Mudanças específicas:
1. Remover o bloco `<Collapsible>` de dentro do `<TableBody>`
2. Após o fechamento de `</Table>`, adicionar o conteúdo expandido condicionalmente quando `expandedCampaign` corresponder a uma campanha
3. O conteúdo usará `w-full` diretamente como `<div>`, sem estar preso dentro de `<table>`
4. Remover imports de `Collapsible` e `CollapsibleContent` se não forem mais usados

## Arquivo Modificado

| Arquivo | Descrição |
|---|---|
| `src/components/traffic/CampaignsAndReports.tsx` | Mover seção expandida para fora da tabela |

