

# Evolução Formulário Agenda — Bulletproof Implementation

## Validações prévias
- `leads.status` é **TEXT** (não UUID/FK). Confirmado em `src/lib/crm/leadStatus.ts`: usa strings canônicas (`"scheduled"`, `"meeting"`, etc.). O hook `useLeadStatuses` gere `lead_statuses` (status customizados de UI), mas a coluna `leads.status` armazena a string canônica.
- Valor correto a injetar: `"scheduled"` (canônico) — alinhado com `normalizeLeadStatusToDb` e badge "Agendamentos".
- `lead_history` existe e o trigger `track_lead_changes` já regista mudança de status automaticamente. Mesmo assim, vamos inserir um registo manual com `action_type: "meeting_scheduled"` para descrição rica.

## 1. `src/components/agenda/MeetingFormDialog.tsx`

### Helper sanitizer (Guardrail 1)
Adicionar acima do componente, junto ao `formatPhoneBR`:
```ts
const normalizeAndFormatPhone = (rawPhone: string): string => {
  if (!rawPhone) return "";
  let cleaned = rawPhone.replace(/\D/g, "");
  if (cleaned.startsWith("55") && (cleaned.length === 12 || cleaned.length === 13)) {
    cleaned = cleaned.substring(2);
  }
  return formatPhoneBR(cleaned);
};
```
Usar em **todos** os auto-fills vindos do CRM (lead + cliente).

### Query expansion
- Leads query: `select("id, name, phone, created_at")`.
- Clients query: já tem `contact` (mantém).

### Auto-fill centralizado (Guardrail 2 — anti-pattern fix)
Substituir os 2 `useEffect` separados por **um único** `useEffect` com precedência clara:
```ts
useEffect(() => {
  if (!leads.length && !clients.length) return;

  // Precedência absoluta: Lead > Cliente
  if (formData.lead_id) {
    const lead = leads.find(l => l.id === formData.lead_id);
    if (lead?.phone) {
      setClientWhatsapp(normalizeAndFormatPhone(lead.phone));
      return;
    }
  }

  const clientId = selectedClientIds[0];
  if (clientId && !clientId.startsWith("agency:")) {
    const client = clients.find(c => c.id === clientId);
    if (client?.contact) {
      setClientWhatsapp(normalizeAndFormatPhone(client.contact));
      return;
    }
  }
}, [formData.lead_id, selectedClientIds, leads, clients]);
```
Decisão única → sem race condition entre effects.

### `loadMeetingData` (duplicação)
Já implementado anteriormente — `duplicateFrom` não copia `client_whatsapp`; o auto-fill centralizado assume.

### Submit — Automação CRM
Após `await createMeeting.mutateAsync(...)` bem-sucedido, se `formData.lead_id`:
```ts
try {
  await supabase
    .from("leads")
    .update({ status: "scheduled" })
    .eq("id", formData.lead_id);

  await supabase.from("lead_history").insert({
    lead_id: formData.lead_id,
    agency_id: currentAgency.id,
    user_id: user.id,
    action_type: "meeting_scheduled",
    field_name: "meeting",
    new_value: `${formData.title} — ${format(new Date(formData.start_time), "dd/MM/yyyy 'às' HH:mm")}`,
  });
} catch (err) {
  console.error("CRM sync failed (non-blocking):", err);
}
```
Fire-and-forget — falha não bloqueia criação da reunião. (Guardrail 3: string canônica `"scheduled"` confirmada como tipo correto da coluna.)

### Redesign UI — Collapsible
Importar `Collapsible, CollapsibleTrigger, CollapsibleContent` de `@/components/ui/collapsible`, ícone `Settings2` e `ChevronDown` de `lucide-react`.

Agrupar dentro de **"Configurações de Acesso e Notificação"** (default fechado):
- Link Google Meet
- Local
- Toggle Google Calendar Sync
- Secção WhatsApp Reminder completa

### Mensagem informativa para Leads
Abaixo do seletor de Lead, quando `formData.lead_id`:
```tsx
<p className="text-xs text-blue-600 flex items-center gap-1.5 mt-2">
  <Info className="h-3 w-3 shrink-0" />
  Ao salvar, este lead será movido automaticamente para "Agendamentos" no CRM.
</p>
```

### Badge "Lead" no seletor
Pequeno `Badge variant="outline"` verde ao lado do nome do lead selecionado para distinguir de Cliente.

## Guardrails aplicados

| # | Guardrail | Implementação |
|---|-----------|---------------|
| 1 | Sanitizer obrigatório | `normalizeAndFormatPhone` remove DDI 55, aplica máscara — usado em lead + cliente |
| 2 | Anti-pattern eliminado | Único `useEffect` com precedência explícita Lead > Cliente; sem race condition |
| 3 | Tipagem segura CRM | Validado: `leads.status` é TEXT, valor canônico `"scheduled"` correto |

## Ficheiro alterado
- `src/components/agenda/MeetingFormDialog.tsx` (único)

Sem migration. Sem alteração em hooks (`useMeetings` já aceita os campos).

