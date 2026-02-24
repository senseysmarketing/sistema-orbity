
# Correcao do Seletor de Usuarios + Obrigatoriedade

## Problema Raiz
A query no `ContentPlanDetailsSheet.tsx` usa `profiles(full_name)` na linha 49, mas a tabela `profiles` nao possui a coluna `full_name` -- o campo correto e `name`. Por isso, a query retorna dados vazios e o seletor mostra "Nenhum usuario encontrado".

No wizard (`ContentPlanWizard.tsx`), a query correta ja esta sendo usada: `profiles:user_id(name)`.

## Alteracoes

### 1. ContentPlanDetailsSheet.tsx - Corrigir query de usuarios
- Linha 49: trocar `profiles(full_name)` por `profiles:user_id(name)`
- Linha 54: trocar `u.profiles?.full_name` por `u.profiles?.name`
- Adicionar campo `id` na select: `"id, user_id, role, profiles:user_id(name)"`

### 2. ContentPlanDetailsSheet.tsx - Tornar selecao de usuario obrigatoria
- No botao "Criar Tarefas" (linha 188), adicionar `assignedUserIds.length === 0` na condicao de `disabled`
- Atualizar o texto do botao para indicar que usuario e obrigatorio quando nenhum esta selecionado
- Adicionar texto de aviso caso tente criar sem usuario selecionado

### Detalhes Tecnicos
A query corrigida ficara:
```text
.from("agency_users")
.select("id, user_id, role, profiles:user_id(name)")
.eq("agency_id", currentAgency.id)
```
E o mapeamento:
```text
name: u.profiles?.name || "Sem nome"
```

O botao sera desabilitado quando `selectedItems.size === 0 || assignedUserIds.length === 0`.
