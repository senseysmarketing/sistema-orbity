

# Implementação Final: Hub de Configurações CRM

## Refinamentos aprovados
1. **Hover de ícone**: `group` no Card + `text-muted-foreground transition-colors group-hover:text-primary` no ícone
2. **Separator** entre `MetaIntegrationConfig` e `WebhooksManager` na gaveta de Integrações
3. **`h-full`** nos cards para alinhamento uniforme do grid

## Estrutura final do `CRMSettings.tsx`

```tsx
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { GitMerge, Target, MessageCircle, Link2, DollarSign } from "lucide-react";
import { CustomStatusManager } from "./CustomStatusManager";
import { LeadScoringConfig } from "./LeadScoringConfig";
import { WhatsAppTemplateManager } from "./WhatsAppTemplateManager";
import { MetaIntegrationConfig } from "./MetaIntegrationConfig";
import { WebhooksManager } from "./WebhooksManager";
import { ManualInvestmentManager } from "./ManualInvestmentManager";
```

### 5 Cards no grid

| # | Card | Ícone | Sheet width | Conteúdo |
|---|------|-------|-------------|----------|
| 1 | Status do Funil | `GitMerge` | `sm:max-w-[600px]` | `<CustomStatusManager />` |
| 2 | Qualificação de Leads | `Target` | `sm:max-w-[700px]` | `<LeadScoringConfig />` |
| 3 | Cadência de WhatsApp | `MessageCircle` | `sm:max-w-[800px]` | `<WhatsAppTemplateManager />` |
| 4 | Fontes & Integrações | `Link2` | `sm:max-w-[800px]` | `Meta` + `<Separator className="my-6" />` + `Webhooks` |
| 5 | Investimentos Manuais | `DollarSign` | `sm:max-w-[600px]` | `<ManualInvestmentManager />` |

### Padrão do Card (SheetTrigger)
```tsx
<Sheet>
  <SheetTrigger asChild>
    <Card className="group h-full hover:border-primary/50 transition-colors cursor-pointer">
      <CardHeader>
        <Icon className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary mb-2" />
        <CardTitle className="text-base">Título</CardTitle>
        <CardDescription>Descrição</CardDescription>
      </CardHeader>
    </Card>
  </SheetTrigger>
  <SheetContent side="right" className="sm:max-w-[XXX] overflow-y-auto">
    <SheetHeader className="mb-6">
      <SheetTitle>Título</SheetTitle>
      <SheetDescription>Contexto</SheetDescription>
    </SheetHeader>
    {/* Componente filho */}
  </SheetContent>
</Sheet>
```

### Grid container
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
```

`items-stretch` (default do grid) + `h-full` nos cards garantem altura uniforme sem distorção.

## Ficheiro alterado
- `src/components/crm/CRMSettings.tsx` (refatoração completa, ~140 linhas)

Sem migration. Sem mudança em componentes filhos.

