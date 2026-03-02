

# Restringir Alteracoes de Metas e Bonus Apenas para Admins

## Problema Encontrado

Existem falhas na protecao de permissoes na tela de Metas e Bonus:

1. Quando nao existe programa ativo, o seletor de programas aparece para TODOS os usuarios -- qualquer membro poderia criar ou selecionar um programa
2. As funcoes de escrita (criar periodo, excluir, atualizar scorecard, selecionar programa) nao verificam `isAdmin` internamente -- dependem apenas do botao estar oculto na interface
3. Um usuario tecnico poderia manipular o frontend e chamar essas funcoes

## Solucao

Adicionar verificacoes de admin em duas camadas:

### Camada 1: Interface (UX)

**Arquivo: `src/pages/Goals.tsx`**
- Quando nao existe programa ativo e o usuario NAO e admin: mostrar uma mensagem informativa ("Nenhum programa configurado. Solicite ao administrador.") em vez do ProgramSelector
- Adicionar guarda `if (!isAdmin) return` no inicio de `handleSelectProgram`

### Camada 2: Funcoes de escrita (seguranca)

**Arquivo: `src/components/goals/PPRDashboard.tsx`**
- Adicionar `if (!isAdmin) return` no inicio de:
  - `handleCreatePeriod`
  - `handleCreateFromDialog`
  - `handleDeletePeriod`
  - `handlePeriodUpdate`
  - `handleScorecardUpdate`
  - `handleDeleteNpsResponse`
  - `handleSaveEditNps`
  - `startEditNps`

Isso garante que mesmo que alguem manipule a interface, as funcoes nao executam sem permissao de admin.

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Goals.tsx` | Guarda admin no seletor de programa e na funcao handleSelectProgram |
| `src/components/goals/PPRDashboard.tsx` | Guarda admin em todas as funcoes de escrita |

## Nota

A protecao definitiva continua sendo o RLS no Supabase (que ja existe segundo a memoria do projeto). As alteracoes acima sao a camada de protecao no frontend para evitar chamadas desnecessarias e dar feedback correto ao usuario.

