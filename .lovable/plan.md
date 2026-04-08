

# Refatorar tela inicial de Contratos

## Problema
A tela inicial tem abas "Contratos" e "Templates de Servicos" — com a IA integrada, templates de servico nao fazem mais sentido. A tela precisa ser simplificada: apenas a lista de contratos diretamente, sem abas.

## Solucao

### `src/pages/Contracts.tsx`
- Remover import e uso de `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- Remover import de `ServicesTemplateManager` e `Settings`
- Remover toda a estrutura de abas
- Renderizar `<ContractsList>` diretamente quando `showGenerator` e false
- Manter header com titulo + botao "Novo Contrato"
- Adicionar botao "Voltar" no header quando `showGenerator` e true

### `src/components/contracts/ContractsList.tsx`
- Atualizar o empty state para ser mais atrativo e orientado a IA:
  - Icone maior com Sparkles
  - Texto: "Crie seu primeiro contrato com IA"
  - Subtexto explicando que a IA gera o contrato em segundos
  - Adicionar prop `onNewContract` para callback do botao no empty state
- Adicionar status "draft" no `getStatusBadge` (ja que os novos contratos sao salvos como draft)

### Resultado
Tela limpa: header + lista de contratos (ou empty state convidativo). Sem abas, sem templates. Um clique para abrir o workspace de IA.

