

# Substituir "Cadastrar Nova Agência" por botões de copiar links de onboarding

## O que muda
Remover o botão e dialog `CreateAgencyDialog` da tabela de agências e substituir por dois botões compactos que copiam os links de onboarding para o clipboard:

1. **Link Assinatura Direta** → `{origin}/onboarding?flow=direct_monthly` (usuário cadastra e paga)
2. **Link Trial Gratuito** → `{origin}/onboarding?flow=trial` (7 dias grátis)

## Alterações

### 1. `src/components/master/AgenciesTable.tsx`
- Remover import do `CreateAgencyDialog`
- Adicionar imports: `Copy`, `Check` do lucide-react
- Na linha 180 onde está `{onCreated && <CreateAgencyDialog onCreated={onCreated} />}`, substituir por dois botões:
  - Botão "Copiar Link Assinatura" (ícone Copy, variante outline) — copia `${window.location.origin}/onboarding?flow=direct_monthly`
  - Botão "Copiar Link Trial" (ícone Copy, variante outline) — copia `${window.location.origin}/onboarding?flow=trial`
  - Feedback visual: ícone muda para Check por 2s após copiar
- Adicionar estado local para controlar qual botão foi copiado

### 2. `src/pages/Master.tsx`
- Remover a prop `onCreated={refreshAgencies}` do `AgenciesTable` (já não é necessária)

### 3. `src/components/master/AgenciesTable.tsx` (interface)
- Remover a prop `onCreated` da interface `AgenciesTableProps` (ou mantê-la opcional e não usada — preferível remover)

### 4. Arquivo `CreateAgencyDialog.tsx`
- Pode ser mantido no código por agora (não será importado em lugar nenhum), ou removido para limpeza

## Resultado visual
Em vez de um botão escuro "Cadastrar Nova Agência", aparecerão dois botões mais leves ao lado dos status cards:
- `[📋 Link Assinatura]` `[📋 Link Trial]`

