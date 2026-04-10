

# Reordenar abas do Controle de Tráfego

## Alteração
Trocar a ordem das abas para que "Campanhas e Relatórios" apareça primeiro e seja a aba padrão.

## Arquivo: `src/pages/Traffic.tsx`

1. **Default da aba** (linha 43): Alterar fallback de `'clients'` para `'campaigns'`
2. **Ordem dos TabsTrigger** (linhas 335-342): Mover o trigger de "Campanhas e Relatórios" para antes do "Painel de Clientes"
3. **Ordem dos TabsContent** (linhas 345-354): Mover o content de "campaigns" para antes do de "clients"

