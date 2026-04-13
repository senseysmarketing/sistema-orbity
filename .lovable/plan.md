

# Correção de Busca por Telefone e Bug de Edição→Criação no CRM

## Problema 1: Busca não filtra por telefone
O filtro de busca (linha 247-250 de `CRM.tsx`) só pesquisa por `name`, `email` e `company`. Telefone não está incluído.

## Problema 2: Bug de dados "grudados" ao criar novo lead
Quando o usuário edita um lead e fecha o modal, o `selectedLead` não é limpo. Ao clicar "Novo Lead", o `Dialog` abre com `selectedLead` ainda preenchido, puxando os dados do lead anterior no `LeadForm`.

A raiz do problema está na linha 372: `onOpenChange={setShowLeadForm}` — quando o Dialog fecha, ele só seta `showLeadForm = false` mas nunca faz `setSelectedLead(null)`.

---

## Alterações

### Arquivo: `src/pages/CRM.tsx`

**1. Adicionar `phone` ao filtro de busca (linha ~247-250):**
```ts
const matchesSearch = searchQuery === '' || 
  lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  lead.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  lead.company?.toLowerCase().includes(searchQuery.toLowerCase());
```

Para telefone, também normalizar removendo caracteres não-numéricos para que busca por "11999" encontre "(11) 99900-0000":
```ts
const normalizedSearch = searchQuery.replace(/\D/g, '');
const matchesPhone = normalizedSearch.length > 0 && 
  lead.phone?.replace(/\D/g, '').includes(normalizedSearch);

const matchesSearch = searchQuery === '' || 
  lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  matchesPhone;
```

**2. Corrigir bug do selectedLead ao fechar/abrir Dialog (linha ~372):**
```ts
onOpenChange={(open) => {
  setShowLeadForm(open);
  if (!open) setSelectedLead(null);
}}
```

**3. Limpar selectedLead ao clicar "Novo Lead" (no DialogTrigger, linha ~373-377):**
```tsx
<Button variant="action" onClick={() => setSelectedLead(null)}>
```

### Arquivo: `src/components/crm/LeadForm.tsx`

**4. Resetar formData quando `lead` muda de preenchido para null (linha ~74-106):**
Adicionar um `else` no useEffect para resetar o form quando `lead` é null (criação):
```ts
useEffect(() => {
  if (lead && statuses.length > 0) {
    // ... código existente de preenchimento
  } else if (!lead) {
    setFormData({
      name: '', email: '', phone: '', company: '', position: '',
      source: 'manual', status: 'leads', temperature: 'cold',
      value: 0, notes: '', assigned_to: '', last_contact: '',
      next_contact: '', tags: '',
    });
  }
}, [lead, statuses]);
```

## Arquivos modificados
- `src/pages/CRM.tsx`
- `src/components/crm/LeadForm.tsx`

