

# Botões discretos + Agendamento rápido no Kanban CRM (com Guardrails)

## Mudanças

### 1) `SortableLeadCard.tsx`
- Adicionar prop `onScheduleMeeting?: (lead: Lead) => void`.
- Importar ícone `Calendar` (lucide).
- Adicionar `className="group"` no `<Card>`.
- Substituir o `Badge` de WhatsApp por contêiner flex com 2 botões `ghost`/`outline` discretos, **visíveis no mobile, ocultos no desktop até hover**, e blindados contra o dnd-kit:

```tsx
<div 
  className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300"
  onPointerDown={(e) => e.stopPropagation()}
>
  {lead.phone && (
    <Button 
      size="sm" 
      variant="outline" 
      className="flex-1 h-8 text-muted-foreground hover:text-foreground bg-transparent border-white/20 hover:bg-white/10"
      onClick={(e) => { e.stopPropagation(); handleWhatsAppClick(e); }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
    </Button>
  )}
  {onScheduleMeeting && (
    <Button 
      size="sm" 
      variant="outline" 
      className="flex-1 h-8 text-muted-foreground hover:text-foreground bg-transparent border-white/20 hover:bg-white/10"
      onClick={(e) => { e.stopPropagation(); onScheduleMeeting(lead); }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Calendar className="h-3.5 w-3.5 mr-1" /> Reunião
    </Button>
  )}
</div>
```

- Fallback: se não houver telefone **e** não houver `onScheduleMeeting`, manter `LeadScoring` como antes.
- Sem cores hex; tons monocromáticos baseados em tokens (white/foreground/muted) para preservar a estética "quiet luxury" sobre o fundo roxo do card.

### 2) `LeadKanbanColumn.tsx`
- Adicionar prop `onScheduleMeeting?: (lead: Lead) => void` e repassar ao `<SortableLeadCard>`.

### 3) `LeadsKanban.tsx`
- Adicionar prop `onScheduleMeeting?` e repassar para cada `<LeadKanbanColumn>` e para o `<SortableLeadCard>` no `DragOverlay`.

### 4) `MeetingFormDialog.tsx`
- Adicionar à interface: `defaultLeadId?: string;`.
- No `useEffect` de inicialização (quando NÃO há `meeting` nem `duplicateFrom`), pré-preencher `formData.lead_id = defaultLeadId ?? ""`.
- Auto-fill existente (telefone + participantes externos) reage a `formData.lead_id` → funciona automaticamente.

### 5) `src/pages/CRM.tsx`
- State: `meetingDialogOpen`, `meetingDefaultLeadId`.
- Handler `handleScheduleMeeting(lead)` → seta ID e abre dialog.
- Passar `onScheduleMeeting={handleScheduleMeeting}` ao `<LeadsKanban>`.
- Renderizar `<MeetingFormDialog open={...} onOpenChange={...} defaultLeadId={meetingDefaultLeadId} />` com reset do ID no fechamento.

## Guardrails aplicados
| # | Guardrail | Implementação |
|---|-----------|---------------|
| 1 | Mobile-first | `opacity-100 md:opacity-0 md:group-hover:opacity-100` |
| 2 | Anti-drag | `onPointerDown={stopPropagation}` no wrapper E em cada botão |
| 3 | Quiet luxury | `variant="outline"` + tokens monocromáticos, sem hex |

## Comportamento garantido
| Cenário | Resultado |
|---------|-----------|
| Desktop em repouso | Botões invisíveis (kanban limpo) |
| Desktop hover | Fade-in 300ms suave |
| Mobile/touch | Botões sempre visíveis |
| Click em botão | Não dispara drag |
| Click em Reunião | Abre dialog com lead pré-selecionado |
| Lead sem telefone | Apenas botão Reunião aparece |

## Ficheiros alterados
- `src/components/crm/SortableLeadCard.tsx`
- `src/components/crm/LeadKanbanColumn.tsx`
- `src/components/crm/LeadsKanban.tsx`
- `src/components/agenda/MeetingFormDialog.tsx`
- `src/pages/CRM.tsx`

Sem migration. Sem mudança de schema.

