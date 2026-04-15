

# Correção do Formulário de Cliente

## Problema 1: Estado persistente ao reabrir modal
O `useEffect` que reseta o formulário depende apenas de `[client]`. Quando o usuário fecha o modal de "Novo Cliente" e reabre, `client` permanece `null` nas duas vezes, então o reset não executa e os dados digitados permanecem.

**Solução**: Adicionar `open` como dependência do `useEffect`. Quando `open` muda para `true` e `client` é `null`, resetar o formulário para `initialFormData`.

## Problema 2: Campos obrigatórios faltantes
Atualmente apenas o campo "Nome" é obrigatório. Os campos CPF/CNPJ, E-mail, WhatsApp e CEP são opcionais, o que pode causar falhas na geração de cobranças e envio de notificações.

**Solução**: Adicionar validação obrigatória (tanto no HTML quanto no `handleSubmit`) para:
- **CPF/CNPJ** — mínimo 11 dígitos (CPF) ou 14 (CNPJ)
- **E-mail de Faturamento** — campo `required`
- **Contato (WhatsApp)** — mínimo 10 dígitos
- **CEP** — 8 dígitos exatos

Adicionar asteriscos (*) nos labels desses campos e uma validação consolidada no `handleSubmit` que exibe toast com mensagem descritiva antes de submeter.

## Alterações

### `src/components/admin/ClientForm.tsx`
1. **useEffect (linha 124)**: Adicionar `open` às dependências. Quando `open === true && !client`, resetar form e limpar erros.
2. **Labels**: Adicionar `*` nos labels de CPF/CNPJ, E-mail, WhatsApp e CEP.
3. **Inputs**: Adicionar `required` nos inputs de email e contact.
4. **handleSubmit**: Adicionar bloco de validação antes do submit que verifica se document, email, contact e zip_code estão preenchidos, exibindo toast de erro caso contrário.
5. **Remover alerta condicional** de `missingGatewayFields` (agora desnecessário pois os campos são sempre obrigatórios).

