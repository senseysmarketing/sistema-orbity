

# Ajustes no Gerador de Contratos

## Problema 1: Tela intermediaria desnecessaria
Ao clicar em "Novo Contrato", o workspace abre mas o usuario precisa obrigatoriamente selecionar um cliente cadastrado. A tela inicial (lista de contratos vazia + botao "Novo Contrato") pode ser simplificada — o workspace deve abrir diretamente quando nao ha contratos.

**Decisao**: Manter a tela de lista (ela sera util quando houver contratos salvos), mas o fluxo do SmartContractGenerator precisa permitir uso sem cliente cadastrado.

## Problema 2: Obrigatoriedade de cliente cadastrado
Atualmente o botao "Gerar com IA" exige `selectedClientId` e o `handleGenerate` valida `selectedClient`. Precisa de uma opcao "Cliente Manual" com campos para preencher nome, documento/CNPJ e contato.

## Solucao

### `src/components/contracts/SmartContractGenerator.tsx`

1. **Adicionar toggle de modo cliente**: Um seletor com 2 opcoes — "Cliente cadastrado" e "Novo cliente (manual)"
   - Usar botoes ou radio inline acima do Select

2. **Campos manuais** (vistos quando modo = manual):
   - Nome do Cliente (Input, obrigatorio)
   - CPF/CNPJ (Input, opcional)
   - Contato / E-mail (Input, opcional)

3. **Ajustar validacao no `handleGenerate`**:
   - Se modo cadastrado: validar `selectedClient` (como hoje)
   - Se modo manual: validar que `manualClientName` nao esta vazio
   - Construir payload com dados manuais quando aplicavel

4. **Ajustar `handleSave`**:
   - Se modo manual: `client_id: null`, `client_name: manualClientName`

5. **Remover obrigatoriedade de `selectedClientId`** no `disabled` do botao "Gerar com IA" — depende do modo escolhido

### Estados novos
- `clientMode: 'registered' | 'manual'`
- `manualClientName: string`
- `manualClientDocument: string`
- `manualClientContact: string`

### UI do toggle
Dois botoes inline (estilo segmented control) usando `Button variant="outline"` com destaque no ativo, posicionados antes do Select/campos manuais.

