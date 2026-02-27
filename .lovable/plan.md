

# Corrigir Troca de Programa sem Perder Dados

## Problema

Ao clicar em "Trocar Programa" e selecionar o mesmo programa (ou qualquer outro), o sistema:
1. Desativa o programa atual (`is_active = false`)
2. Cria um novo registro do zero com config padrao
3. Os periodos, scorecards e dados financeiros ficam orfaos (vinculados ao programa antigo)

Ou seja, o usuario perde tudo ao "trocar" para o mesmo programa.

## Solucao

Alterar a logica de `handleSelectProgram` para:

1. **Se o usuario selecionar o mesmo tipo de programa que ja esta ativo**: simplesmente fechar o seletor e voltar ao dashboard (nao faz nada no banco)
2. **Se o usuario selecionar um tipo diferente**: verificar se ja existe um programa daquele tipo (mesmo que inativo) para a agencia. Se existir, reativa-lo em vez de criar um novo. Apenas criar um novo se nunca existiu aquele tipo.

## Detalhes Tecnicos

### Arquivo: `src/pages/Goals.tsx`

**Alterar `handleSelectProgram`:**

```
const handleSelectProgram = async (type: string) => {
  // Se o tipo selecionado e o mesmo do programa ativo, apenas voltar
  if (activeProgram && activeProgram.program_type === type) {
    setShowSelector(false);
    return;
  }

  // Tipos indisponiveis
  if (type !== "ppr") {
    toast({ title: "Em breve", description: "..." });
    return;
  }

  // Verificar se ja existe um programa deste tipo (inativo) para a agencia
  const { data: existing } = await supabase
    .from("bonus_programs")
    .select("*")
    .eq("agency_id", currentAgency.id)
    .eq("program_type", type)
    .maybeSingle();

  // Desativar o programa atual
  if (activeProgram) {
    await supabase
      .from("bonus_programs")
      .update({ is_active: false })
      .eq("id", activeProgram.id);
  }

  if (existing) {
    // Reativar o programa existente (preserva periodos e dados)
    await supabase
      .from("bonus_programs")
      .update({ is_active: true })
      .eq("id", existing.id);
  } else {
    // Criar novo apenas se nunca existiu
    await supabase.from("bonus_programs").insert([...]);
  }

  setShowSelector(false);
  fetchProgram();
};
```

Esta abordagem garante que:
- Selecionar o mesmo programa ativo nao faz nada (dados intactos)
- Trocar para um programa que ja foi usado antes reativa o registro original (periodos e scorecards preservados)
- Criar novo so acontece quando o tipo nunca foi configurado

