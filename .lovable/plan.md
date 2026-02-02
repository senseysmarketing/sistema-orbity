
# Campo de Lead com Busca no Modal de Nova Reunião

## Situação Atual

O campo "Lead" no modal de nova reunião (`MeetingFormDialog.tsx`) utiliza um componente `Select` simples que exibe todos os leads em uma lista dropdown estática, sem opção de busca e sem ordenação específica.

---

## Solução Proposta

Transformar o campo de Lead em um seletor com busca utilizando o componente `Command` (já importado no arquivo), similar ao padrão usado em outros seletores do sistema. Os leads serão ordenados do mais recente para o mais antigo usando o campo `created_at`.

---

## Mudanças Técnicas

### Arquivo: `src/components/agenda/MeetingFormDialog.tsx`

#### 1. Modificar a query de leads para ordenar por data

```typescript
// Antes (linha 149-160)
const { data: leads = [] } = useQuery({
  queryKey: ["leads", currentAgency?.id],
  queryFn: async () => {
    if (!currentAgency?.id) return [];
    const { data } = await supabase
      .from("leads")
      .select("id, name")
      .eq("agency_id", currentAgency.id);
    return data || [];
  },
  enabled: !!currentAgency?.id,
});

// Depois
const { data: leads = [] } = useQuery({
  queryKey: ["leads", currentAgency?.id],
  queryFn: async () => {
    if (!currentAgency?.id) return [];
    const { data } = await supabase
      .from("leads")
      .select("id, name, created_at")
      .eq("agency_id", currentAgency.id)
      .order("created_at", { ascending: false }); // Mais recentes primeiro
    return data || [];
  },
  enabled: !!currentAgency?.id,
});
```

#### 2. Adicionar estado para controlar o popover de leads

```typescript
const [leadsPopoverOpen, setLeadsPopoverOpen] = useState(false);
```

#### 3. Substituir Select por Popover + Command (linhas 488-511)

```typescript
// Antes: Select simples
<Select value={formData.lead_id || "none"} onValueChange={...}>
  <SelectTrigger>...</SelectTrigger>
  <SelectContent>...</SelectContent>
</Select>

// Depois: Popover com Command (busca)
<Popover open={leadsPopoverOpen} onOpenChange={setLeadsPopoverOpen}>
  <PopoverTrigger asChild>
    <Button variant="outline" role="combobox" className="w-full justify-between">
      {formData.lead_id
        ? leads.find((l) => l.id === formData.lead_id)?.name
        : "Selecione um lead..."}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-full p-0" align="start">
    <Command>
      <CommandInput placeholder="Buscar lead..." />
      <CommandList>
        <CommandEmpty>Nenhum lead encontrado.</CommandEmpty>
        <CommandGroup>
          <CommandItem
            value="none"
            onSelect={() => {
              setFormData({ ...formData, lead_id: "" });
              setLeadsPopoverOpen(false);
            }}
          >
            <Check className={cn("mr-2 h-4 w-4", !formData.lead_id ? "opacity-100" : "opacity-0")} />
            Nenhum
          </CommandItem>
          {leads.map((lead) => (
            <CommandItem
              key={lead.id}
              value={lead.name}
              onSelect={() => {
                setFormData({ ...formData, lead_id: lead.id });
                setSelectedClientIds([]); // Limpa clientes quando seleciona lead
                setLeadsPopoverOpen(false);
              }}
            >
              <Check className={cn("mr-2 h-4 w-4", formData.lead_id === lead.id ? "opacity-100" : "opacity-0")} />
              {lead.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

#### 4. Adicionar import necessário

```typescript
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
```

---

## Comportamento Final

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Tipo de campo | Dropdown estático | Campo de busca com autocomplete |
| Ordenação | Sem ordenação específica | Mais recentes primeiro (created_at DESC) |
| Busca | Não disponível | Digitar para filtrar leads pelo nome |
| UX | Scroll em lista longa | Busca rápida + scroll |

---

## Fluxo de Uso

```text
1. Usuário clica no campo "Lead"
2. Popover abre com campo de busca
3. Usuário digita nome do lead
4. Lista filtra automaticamente
5. Leads aparecem ordenados do mais recente para o mais antigo
6. Usuário seleciona o lead desejado
7. Popover fecha e nome aparece no campo
```
