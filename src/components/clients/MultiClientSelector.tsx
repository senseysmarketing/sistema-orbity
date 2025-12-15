import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
}

interface MultiClientSelectorProps {
  clients: Client[];
  selectedClientIds: string[];
  onSelectionChange: (clientIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MultiClientSelector({
  clients,
  selectedClientIds,
  onSelectionChange,
  placeholder = "Selecionar clientes...",
  disabled = false,
}: MultiClientSelectorProps) {
  const [open, setOpen] = useState(false);

  const toggleClient = (clientId: string) => {
    if (selectedClientIds.includes(clientId)) {
      onSelectionChange(selectedClientIds.filter((id) => id !== clientId));
    } else {
      onSelectionChange([...selectedClientIds, clientId]);
    }
  };

  const removeClient = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange(selectedClientIds.filter((id) => id !== clientId));
  };

  const selectedClients = clients.filter((c) => selectedClientIds.includes(c.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between min-h-10 h-auto"
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedClients.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedClients.map((client) => (
                <Badge
                  key={client.id}
                  variant="secondary"
                  className="mr-1 mb-1"
                >
                  {client.name}
                  <button
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => removeClient(client.id, e)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar cliente..." />
          <CommandList>
            <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
            <CommandGroup>
              {clients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.name}
                  onSelect={() => toggleClient(client.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedClientIds.includes(client.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {client.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
