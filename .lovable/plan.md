

# Remover referências a trial/teste grátis da Landing Page

## Problema
Vários componentes da landing page ainda mencionam "teste grátis", "7 dias grátis", "Experimente" e "Crie sua conta grátis", inconsistente com o modelo de venda consultiva.

## Alterações

### 1. `src/components/landing/FeaturesGrid.tsx` (linhas 105-112)
- Trocar botão "Experimente Todas as Funções" → "Quero Conhecer o Orbity" apontando para abrir o ApplicationModal (precisa receber `onOpenApplication` como prop)
- Remover texto "7 dias grátis, sem cartão de crédito"

### 2. `src/components/landing/DemoSection.tsx` (linhas 74-78)
- Trocar botão "Começar Teste Grátis de 7 Dias" → "Agende uma Demonstração" apontando para o ApplicationModal (receber `onOpenApplication` como prop)

### 3. `src/components/landing/LandingPage.tsx`
- Passar `onOpenApplication={openApplication}` para `<FeaturesGrid />` e `<DemoSection />`

### 4. Tooltips nos demos (5 arquivos)
- `DemoTasksView.tsx`: "Crie sua conta grátis para adicionar tarefas" → "Solicite acesso para adicionar tarefas"
- `DemoSocialView.tsx`: "Crie sua conta grátis para criar posts" → "Solicite acesso para criar posts"
- `DemoCRMView.tsx`: "Crie sua conta grátis para adicionar leads" → "Solicite acesso para adicionar leads"
- `DemoAgendaView.tsx`: "Crie sua conta grátis para agendar reuniões" → "Solicite acesso para agendar reuniões"
- `DemoClientsView.tsx`: "Crie sua conta grátis para adicionar clientes" → "Solicite acesso para adicionar clientes"

## Arquivos modificados (7)
- `src/components/landing/FeaturesGrid.tsx`
- `src/components/landing/DemoSection.tsx`
- `src/pages/LandingPage.tsx`
- `src/components/landing/demo/DemoTasksView.tsx`
- `src/components/landing/demo/DemoSocialView.tsx`
- `src/components/landing/demo/DemoCRMView.tsx`
- `src/components/landing/demo/DemoAgendaView.tsx`
- `src/components/landing/demo/DemoClientsView.tsx`

