

# Controle Completo de Periodos (Criar, Editar, Excluir)

## Resumo

Transformar o gerenciamento de periodos para dar controle total ao admin: criar periodos com label e datas personalizadas, editar periodos existentes (label, datas, metas), e excluir periodos com confirmacao.

## O que muda

### 1. Criar Periodo via Dialog (nao mais automatico)

Atualmente, ao clicar em "Novo Periodo", o sistema cria automaticamente um periodo baseado no trimestre atual. Isso sera substituido por um dialog que permite ao admin definir:

- **Label** (ex: "Mar-Mai 2026", "Q2 2026")
- **Data inicio** e **Data fim** (inputs tipo `date`)
- **Meta de faturamento recorrente**
- **% do lucro para o pool**
- **Meta de NPS**

### 2. Editar Periodo Existente

O botao "Configurar" (engrenagem) ja abre o `PPRConfigDialog`. Esse dialog sera expandido para incluir tambem:
- Campo de **label** editavel
- Campos de **data inicio** e **data fim**
- Todos os campos ja existentes (meta, %, NPS)

### 3. Excluir Periodo

Adicionar um botao "Excluir" (icone Trash2) ao lado do seletor de periodo. Ao clicar, exibe um `AlertDialog` de confirmacao explicando que todas as respostas NPS e scorecards associados serao excluidos (CASCADE ja esta configurado no banco). Apos confirmar, deleta o periodo e seleciona outro disponivel.

## Arquivos Modificados

### `src/components/goals/PPRConfigDialog.tsx`
- Adicionar props `mode: 'create' | 'edit'` e `onDelete`
- Adicionar campos: `label` (input texto), `start_date` e `end_date` (inputs date)
- No modo "create", todos os campos comecam vazios/com defaults
- No modo "edit", pre-preenche com os valores do periodo
- Botao "Excluir Periodo" (vermelho) visivel apenas no modo edit, abre AlertDialog de confirmacao
- `onSave` retorna todos os campos incluindo label e datas

### `src/components/goals/PPRDashboard.tsx`
- `handleCreatePeriod`: em vez de criar direto, abre o PPRConfigDialog em modo `create`
- Nova funcao `handleDeletePeriod`: deleta o periodo selecionado e seleciona outro
- Adicionar botao Trash2 ao lado do seletor de periodo
- Passar `mode`, `onDelete` e dados completos ao PPRConfigDialog
- No `handlePeriodUpdate` e novo `handleCreateFromDialog`: aceitar label, start_date, end_date alem dos campos atuais

