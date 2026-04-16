

# Auto-fill Participantes Externos — Implementação Bulletproof

## Verificações prévias
- Confirmar nome real da coluna de empresa em `clients` (`company_name` vs `company` vs `business_name`)
- Confirmar nome do campo de participantes externos no state atual (`external_participants`, `participants_external`, etc.)
- Confirmar se `leads` tem coluna `email`

## Implementação

### 1. Queries
- Leads: `.select("id, name, email, phone")`
- Clients: `.select("id, name, email, contact, <coluna_empresa_real>")`

### 2. Helper de formatação (acima do componente)
```ts
const formatParticipantIdentity = (
  name: string,
  email: string,
  company?: string | null
): string => {
  if (!email) return "";
  const cleanName = name?.trim() || "Contato";
  const cleanEmail = email.trim();
  return company?.trim()
    ? `${cleanName} (${company.trim()}) <${cleanEmail}>`
    : `${cleanName} <${cleanEmail}>`;
};
```

### 3. Ref de rastreamento
```ts
const lastAutoParticipantRef = useRef<string | null>(null);
```

### 4. Extensão do useEffect centralizado — estrutura segura

Adicionar **após** a lógica de telefone existente, seguindo ESTRITAMENTE o padrão aprovado (mutação do ref **fora** do updater):

```ts
// === AUTO-FILL DE PARTICIPANTES EXTERNOS ===
let newIdentity = "";

if (formData.lead_id) {
  const lead = leads.find(l => l.id === formData.lead_id);
  if (lead?.email) {
    newIdentity = formatParticipantIdentity(lead.name, lead.email);
  }
} else {
  const clientId = selectedClientIds[0];
  if (clientId && !clientId.startsWith("agency:")) {
    const client = clients.find(c => c.id === clientId);
    if (client?.email) {
      newIdentity = formatParticipantIdentity(
        client.name,
        client.email,
        client.company_name // ajustar conforme schema real
      );
    }
  }
}

// Snapshot do ref ANTES do setState (state updater puro)
const currentAutoFill = lastAutoParticipantRef.current;

setExternalParticipants(prev => {
  const list = prev ? prev.split(",").map(s => s.trim()).filter(Boolean) : [];
  
  const filtered = currentAutoFill
    ? list.filter(p => p !== currentAutoFill)
    : list;
  
  if (newIdentity && !filtered.includes(newIdentity)) {
    filtered.push(newIdentity);
  }
  
  return filtered.join(", ");
});

// Mutação do ref FORA do updater
lastAutoParticipantRef.current = newIdentity || null;
```

### 5. Reset on close
No `handleClose` / reset do form: `lastAutoParticipantRef.current = null;` para evitar leak entre aberturas.

## Comportamento garantido
| Cenário | Resultado |
|---------|-----------|
| Selecionar Lead com email | Adiciona `Nome <email>` ao final |
| Trocar Lead/Cliente | Remove anterior auto-inserido, adiciona novo |
| Limpar seleção | Remove só o auto-fill, preserva manuais |
| Lead/Cliente sem email | Não adiciona nada |
| Cliente com empresa | Formata `Nome (Empresa) <email>` |
| Participantes manuais | Sempre preservados |
| Reabrir modal | Ref resetado, sem leak |

## Guardrails aplicados
1. **State updater puro** — ref nunca é mutado dentro do `setExternalParticipants`
2. **Schema-safe** — coluna de empresa será confirmada antes do uso
3. **Anti-leak** — ref limpo no fechamento do modal
4. **Anti-duplicação** — `!filtered.includes(newIdentity)` antes de push

## Ficheiro alterado
- `src/components/agenda/MeetingFormDialog.tsx` (único)

Sem migration, sem alteração de hooks.

