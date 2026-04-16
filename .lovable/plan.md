

# Lembretes WhatsApp — Implementação com Guardrails

## Migration SQL
```sql
ALTER TABLE public.meetings
  ADD COLUMN whatsapp_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN client_whatsapp text,
  ADD COLUMN reminder_hours_before integer NOT NULL DEFAULT 2;
```

## `src/hooks/useMeetings.tsx`
- Adicionar à interface `Meeting`: `whatsapp_reminder_enabled?: boolean`, `client_whatsapp?: string | null`, `reminder_hours_before?: number`.
- Incluir os 3 campos no payload de `createMeeting.mutationFn`.

## `src/components/agenda/MeetingFormDialog.tsx`

### Estado
- `whatsappReminderEnabled` (bool, default false)
- `clientWhatsapp` (string, default "")
- `reminderHoursBefore` (number, default 2)
- `phoneInputRef` (useRef para focus no erro)

### Helper `formatPhoneBR`
Máscara `(99) 99999-9999`, max 11 dígitos.

### Auto-fill por cliente (useEffect em `selectedClientIds[0]`)
- Atualizar query `clients` para `select("id, name, contact")`.
- Quando cliente muda, buscar `contact` e aplicar `formatPhoneBR` em `clientWhatsapp`. Sobrescreve sempre que o cliente mudar (garante consistência).

### `loadMeetingData` (Guardrail 2 — Duplicação Inteligente)
- **Em modo edição (`meeting`)**: restaurar os 3 campos normalmente.
- **Em modo duplicação (`duplicateFrom`)**: copiar `whatsapp_reminder_enabled` e `reminder_hours_before`, mas **NÃO** copiar `client_whatsapp` — deixar vazio para o auto-fill do cliente atualmente selecionado preencher.

### `handleSubmit` (Guardrail 1 — Validação Rigorosa)
Antes de chamar `createMeeting`/`updateMeeting`:
```ts
if (whatsappReminderEnabled && clientWhatsapp.replace(/\D/g, '').length < 10) {
  toast.error("Por favor, preencha o WhatsApp do cliente para enviar o lembrete.");
  phoneInputRef.current?.focus();
  return;
}
```
(14 chars na máscara = 10 dígitos mínimo BR.)

Incluir no payload:
```ts
whatsapp_reminder_enabled: whatsappReminderEnabled,
client_whatsapp: whatsappReminderEnabled ? clientWhatsapp : null,
reminder_hours_before: reminderHoursBefore,
```

### Nova UI (antes dos botões de ação)
Card "Lembrete Automático" com:
- `Switch` toggle + descrição.
- Se ativo: grid 2 cols com `Input` (telefone, ref, máscara) + `Select` (1h/2h/12h/24h).

### Reset
`resetForm` zera os 3 campos.

## `src/components/agenda/MeetingCard.tsx`
- Import `MessageCircle` de `lucide-react`.
- Ao lado do horário (com `flex items-center gap-1`):
```tsx
{meeting.whatsapp_reminder_enabled && (
  <MessageCircle className="h-3 w-3 text-green-600/70" aria-label="Lembrete WhatsApp ativo" />
)}
```

## Guardrails

| # | Guardrail | Implementação |
|---|-----------|---------------|
| 1 | Validação Submit | Bloqueia se `enabled && telefone < 10 dígitos`, toast + focus |
| 2 | Duplicação Inteligente | `duplicateFrom` não copia `client_whatsapp`; auto-fill assume |

## Ficheiros
- Migration SQL (3 colunas em `meetings`)
- `src/hooks/useMeetings.tsx`
- `src/components/agenda/MeetingFormDialog.tsx`
- `src/components/agenda/MeetingCard.tsx`

