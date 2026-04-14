

# Validacao CPF + Auto-preenchimento CNPJ (BrasilAPI)

## Resumo
Adicionar validacao de CPF em tempo real, auto-preenchimento via CNPJ (BrasilAPI) com prioridade para nome fantasia, e bloqueio no submit para CPF invalido. Usa `setFormData` (estado React puro, sem react-hook-form).

## Alteracoes (1 arquivo: `ClientForm.tsx`)

### 1. Nova funcao `validateCPF`
Algoritmo padrao de digitos verificadores. Rejeita sequencias repetidas (111..., 222..., etc). Retorna boolean.

### 2. Novos states
- `cnpjLoading: boolean` — spinner no campo documento durante fetch
- `documentError: string | null` — mensagem "CPF invalido"

### 3. Alterar onChange do campo document
Apos aplicar mascara, extrair digits:
- Se `digits.length === 11`: rodar `validateCPF`. Se invalido, `setDocumentError("CPF inválido")`. Senao, limpar erro.
- Se `digits.length === 14`: disparar `fetchCnpjData(digits)`
- Outros tamanhos: limpar erro

### 4. Nova funcao `fetchCnpjData`
```typescript
const fetchCnpjData = async (cnpj: string) => {
  setCnpjLoading(true);
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const cep = (data.cep || '').replace(/\D/g, '');
    setFormData(prev => ({
      ...prev,
      name: data.nome_fantasia || data.razao_social || prev.name,
      zip_code: cep ? formatCep(cep) : prev.zip_code,
      street: data.logradouro || prev.street,
      number: data.numero || prev.number,
      complement: data.complemento || prev.complement,
      neighborhood: data.bairro || prev.neighborhood,
      city: data.municipio || prev.city,
      state: data.uf || prev.state,
    }));
    // SEM chamar fetchAddressByCep — BrasilAPI ja retorna endereco completo
    toast({ title: "CNPJ encontrado", description: `Dados de "${data.nome_fantasia || data.razao_social}" importados.` });
  } catch {
    toast({ title: "CNPJ não encontrado", description: "Preencha os dados manualmente.", variant: "destructive" });
  } finally {
    setCnpjLoading(false);
  }
};
```

Pontos-chave conforme solicitado:
- **Sem busca dupla de CEP** — nao chama `fetchAddressByCep` apos CNPJ
- **Prioridade nome fantasia** — `data.nome_fantasia || data.razao_social`
- **Estado React puro** — usa `setFormData` (o form nao usa react-hook-form)

### 5. UI do campo document
- Envolver em `div.relative` para posicionar spinner
- Mostrar `Loader2 animate-spin` quando `cnpjLoading`
- Abaixo do input, renderizar `documentError` em `<p className="text-xs text-destructive">`

### 6. Validacao no submit
Antes do bloco existente de validacao, verificar:
```typescript
const docDigits = formData.document.replace(/\D/g, '');
if (docDigits.length === 11 && !validateCPF(docDigits)) {
  toast({ title: "CPF inválido", description: "Verifique o documento.", variant: "destructive" });
  return;
}
```

## Resumo de arquivos
- 1 componente alterado (`ClientForm.tsx`)
- 0 migrations, 0 edge functions

