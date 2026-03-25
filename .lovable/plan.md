

# Diario de Otimizacoes (OptimizationSheet)

## Resumo
Criar uma gaveta lateral com formulario de registro + timeline de historico de otimizacoes por cliente de trafego. Dados mockados em state local.

## Arquivos

### 1. Criar `src/components/traffic/OptimizationSheet.tsx`
Sheet lateral (side="right") com:

**Props**: `isOpen`, `onClose`, `clientName`, `adAccountId`

**Mock state** inicial com 3 registros de exemplo (datas passadas, acoes variadas, status diferentes).

**Formulario (parte superior)**:
- Data da Acao: DatePicker (Popover + Calendar, default hoje)
- O que foi feito: Textarea
- Status do Teste: Select com opcoes "Em Rodagem", "Vencedor", "Perdedor" (badges azul/amarelo, verde, vermelho)
- Novos Criativos: Input type number
- Observacoes / Pedidos ao Cliente: Textarea
- Alerta Inteligente: Checkbox "Lembrar de analisar este teste" + input numerico condicional "em [X] dias"
- Botao "Salvar Registro" — adiciona ao array mockado e limpa formulario

**Timeline (parte inferior, ScrollArea)**:
- Linha vertical com circulos coloridos por status
- Cada item: data formatada, acao, badge de status, contagem de criativos, observacoes
- Ordenado por data desc

### 2. Editar `src/components/traffic/ClientCard.tsx`
- Adicionar state `isOptimizationOpen`
- Adicionar botao com icone `Activity` (tooltip "Diario de Otimizacoes") no grupo de botoes do header (ao lado de refresh e edit, linha ~265)
- Renderizar `<OptimizationSheet>` passando `clientName={client.ad_account_name}` e `adAccountId={client.ad_account_id}`

## Design
- Componentes shadcn: Sheet, Calendar, Popover, Select, Textarea, Input, Checkbox, Badge, Button, ScrollArea, Separator
- Timeline: div com `border-l-2` e circulos absolutos posicionados, cores por status
- Sheet width: `sm:max-w-lg` para ter espaco confortavel

