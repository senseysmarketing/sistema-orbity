
# Corrigir Carregamento do Cliente no Formulário de Pagamento

## Problema Identificado

Ao clicar em "Gerar Pagamento" a partir do card de um cliente, o formulário abre mas:
1. O campo "Cliente" não mostra o nome do cliente selecionado (mostra "Selecione um cliente")
2. Ao tentar salvar, ocorre erro porque o `client_id` pode não estar sendo processado corretamente

### Causa Raiz

O componente `Select` do Radix UI só exibe o valor selecionado quando ele existe na lista de opções (`clients`). Quando o formulário abre com `preselectedClient`, duas condições podem causar o problema:

1. **Race condition**: A lista de `clients` ainda não foi carregada quando o formulário abre
2. **Referência no useEffect**: O `formData` é inicializado com valores default antes do `preselectedClient` estar disponível

---

## Arquivo a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/components/admin/PaymentForm.tsx` | Corrigir inicialização e exibição do cliente pré-selecionado |

---

## Solução

### 1. Exibir Nome do Cliente Quando Pré-selecionado

Quando temos um `preselectedClient`, mostrar o nome diretamente em vez de depender do Select:

```typescript
{preselectedClient ? (
  <Input
    value={preselectedClient.name}
    disabled
    className="bg-muted"
  />
) : (
  <Select
    value={formData.client_id}
    onValueChange={handleClientChange}
    required
  >
    {/* ... opções ... */}
  </Select>
)}
```

### 2. Garantir que o formData seja Resetado Corretamente

Atualizar o `useEffect` para garantir timing correto:

```typescript
useEffect(() => {
  // Só processa quando o dialog abre
  if (!open) return;
  
  if (payment) {
    setFormData({
      client_id: payment.client_id || '',
      amount: payment.amount || '',
      due_date: payment.due_date ? payment.due_date.split('T')[0] : '',
      paid_date: payment.paid_date ? payment.paid_date.split('T')[0] : '',
      status: payment.status || 'pending',
      description: payment.description || '',
    });
  } else if (preselectedClient) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const defaultDueDate = new Date(currentYear, currentMonth, 15);
    
    setFormData({
      client_id: preselectedClient.id,
      amount: preselectedClient.monthly_value?.toString() || '',
      due_date: defaultDueDate.toISOString().split('T')[0],
      paid_date: '',
      status: 'pending',
      description: '',
    });
  } else {
    setFormData({
      client_id: '',
      amount: '',
      due_date: '',
      paid_date: '',
      status: 'pending',
      description: '',
    });
  }
}, [open, payment, preselectedClient]);
```

---

## Mudanças Detalhadas

### Linha 25-32: Inicialização Simplificada
Remover lógica de inicialização que usa `preselectedClient`:

```typescript
const [formData, setFormData] = useState({
  client_id: '',
  amount: '',
  due_date: '',
  paid_date: '',
  status: 'pending',
  description: '',
});
```

### Linhas 38-72: useEffect com Verificação de `open`
Adicionar verificação `if (!open) return;` no início para garantir que o formData só seja populado quando o dialog realmente abrir.

### Linhas 152-171: Campo Cliente com Renderização Condicional
Substituir o Select por Input quando `preselectedClient` existir:

```typescript
<div className="grid gap-2">
  <Label htmlFor="client_id">Cliente *</Label>
  {preselectedClient ? (
    <Input
      value={preselectedClient.name}
      disabled
      className="bg-muted cursor-not-allowed"
    />
  ) : (
    <Select
      value={formData.client_id}
      onValueChange={handleClientChange}
      required
    >
      <SelectTrigger>
        <SelectValue placeholder="Selecione um cliente" />
      </SelectTrigger>
      <SelectContent>
        {clients.map((client) => (
          <SelectItem key={client.id} value={client.id}>
            {client.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )}
</div>
```

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Campo mostra "Selecione um cliente" | Campo mostra "Space Imob" (nome do cliente) |
| Erro ao salvar por client_id inválido | Pagamento criado com sucesso |
| Dependência da lista de clientes carregada | Exibe nome direto do `preselectedClient` |

---

## Fluxo Corrigido

```text
1. Usuário clica "Gerar Pagamento" no card
           │
2. setPreselectedClientForPayment({ id, name, monthly_value })
           │
3. setPaymentFormOpen(true)
           │
4. Dialog abre → useEffect detecta open=true
           │
5. formData.client_id = preselectedClient.id
           │
6. Input exibe preselectedClient.name (não depende de clients[])
           │
7. Usuário clica "Criar"
           │
8. handleSubmit envia client_id correto → ✅ Sucesso
```
