

# Substituir Input de Delay por Select com Opções Pré-definidas

## Alteração

Substituir o `<Input type="number">` de delay por um `<Select>` com opções pré-definidas, diferentes para cada fase:

**Saudação (greeting):**
- Imediato (0 min)
- 30 segundos (0.5 min → arredonda para 1)
- 1 minuto
- 5 minutos
- 10 minutos

**Follow-up:**
- 1 hora (60 min)
- 2 horas (120)
- 6 horas (360)
- 12 horas (720)
- 24 horas (1440)
- 48 horas (2880)
- 72 horas (4320)

## Mudanças técnicas

**Arquivo:** `src/components/crm/WhatsAppTemplateManager.tsx`

1. Adicionar constantes `GREETING_DELAY_OPTIONS` e `FOLLOWUP_DELAY_OPTIONS` com `{ value: number, label: string }`
2. Passar `phase` como prop para `TemplateEditor`
3. Substituir o `<Input>` por `<Select>` do Radix (já importado no projeto)
4. O `delay` state continua como string (valor em minutos), mas agora vem do select
5. Importar `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` de `@/components/ui/select`

