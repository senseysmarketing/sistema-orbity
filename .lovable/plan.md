

# Fix: Aba "Dicas" ainda aparecendo na Central de Ajuda

## Problema
O arquivo `HelpCenter.tsx` ja contem o codigo correto (sem aba Dicas, com IA Suporte como padrao), mas a alteracao anterior pode nao ter sido aplicada corretamente no build. A solucao e reescrever o arquivo para garantir que o build capture a versao atualizada.

## Acao
Reescrever `src/components/help/HelpCenter.tsx` com o conteudo atual (que ja esta correto no repositorio) para forcar o rebuild. O arquivo ja tem:
- Aba "IA Suporte" como `defaultValue="ai"`
- Componente `<HelpAIChat />` integrado
- Sem aba "Dicas"
- 3 abas: IA Suporte, Guias, Videos

Nenhuma mudanca de logica necessaria -- apenas forcar o re-apply do arquivo.

