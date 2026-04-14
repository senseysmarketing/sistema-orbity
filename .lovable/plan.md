

# Ajustes UX do ClientForm.tsx

## Resumo
Reordenar campos (CPF/CNPJ primeiro), mapear email/telefone da BrasilAPI, e corrigir bug do CEP re-fetching no onBlur.

## Alterações (1 arquivo: `ClientForm.tsx`)

### 1. Reordenação dos campos (linhas 354-650)

Nova ordem das seções:

**Dados Principais:**
1. CPF/CNPJ (com spinner) — movido do final para o topo
2. Nome / Status (grid 2 cols)
3. E-mail / Contato WhatsApp (grid 2 cols)

**Endereço:**
4. CEP (com spinner)
5. Rua / Número
6. Complemento / Bairro / Cidade
7. Estado

**Serviço e Contrato:**
8. Serviço / Data de Início
9. Fidelidade toggle + datas contrato
10. Observações

**Configurações de Cobrança:**
11. Valor Mensal / Dia Vencimento / Forma Faturamento

O separador e cabeçalho "Dados de Faturamento" (linhas 546-549) serão removidos. O bloco de endereço ganha seu próprio cabeçalho "Endereço".

### 2. Mapeamento completo da BrasilAPI

Atualizar `fetchCnpjData` (linha 184) para incluir:
```typescript
setFormData(prev => ({
  ...prev,
  name: data.nome_fantasia || data.razao_social || prev.name,
  email: data.email || prev.email,
  contact: data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1.replace(/\D/g, '')) : prev.contact,
  zip_code: cep ? formatCep(cep) : prev.zip_code,
  street: data.logradouro || prev.street,
  number: data.numero || prev.number,
  complement: data.complemento || prev.complement,
  neighborhood: data.bairro || prev.neighborhood,
  city: data.municipio || prev.city,
  state: data.uf || prev.state,
}));
```

### 3. Correção do bug do CEP (re-fetch indevido)

- Novo state: `lastFetchedCep` (string, inicializado como `''`)
- No `useEffect` do client (modo edição, linha 123): setar `lastFetchedCep` com o CEP existente do cliente
- No `fetchCnpjData`: após preencher CEP, setar `lastFetchedCep` com o CEP retornado
- No `onBlur` do CEP (linha 577): mudar de `() => fetchAddressByCep(formData.zip_code)` para:
```typescript
onBlur={() => {
  const cleanCep = formData.zip_code.replace(/\D/g, '');
  if (cleanCep.length === 8 && cleanCep !== lastFetchedCep) {
    fetchAddressByCep(formData.zip_code);
    setLastFetchedCep(cleanCep);
  }
}}
```
- Também setar `lastFetchedCep` dentro de `fetchAddressByCep` após sucesso

## Arquivos alterados
- `src/components/admin/ClientForm.tsx` — 1 arquivo, 0 migrations

