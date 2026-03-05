

# Saudação e Follow-up em Blocos Side-by-Side

## O que será feito

Reorganizar as seções "Saudação" e "Follow-up" em um grid de 2 colunas (lado a lado), similar ao layout já existente de Horários de Envio + Origens Permitidas.

## Alteração

### `src/components/crm/WhatsAppTemplateManager.tsx`

Substituir o layout vertical atual (Saudação → Separator → Follow-up) por um grid 2 colunas:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <TemplatePhaseSection ... greeting />
  <TemplatePhaseSection ... followup />
</div>
```

Remover o `<Separator />` entre eles. Cada `TemplatePhaseSection` será envolvida em um `Card` para criar o visual de bloco consistente com os blocos acima.

Arquivo único a modificar: `WhatsAppTemplateManager.tsx` (linhas 149-173).

