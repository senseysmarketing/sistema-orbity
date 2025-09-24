import { useState } from 'react';
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface User {
  id: string;
  user_id: string;
  name: string;
  role: string;
}

interface MultiUserSelectorProps {
  users: User[];
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  placeholder?: string;
  emptyText?: string;
}

export function MultiUserSelector({
  users,
  selectedUserIds,
  onSelectionChange,
  placeholder = "Selecionar usuários...",
  emptyText = "Nenhum usuário encontrado."
}: MultiUserSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedUsers = users.filter(user => selectedUserIds.includes(user.user_id));

  const toggleUser = (userId: string) => {
    const newSelection = selectedUserIds.includes(userId)
      ? selectedUserIds.filter(id => id !== userId)
      : [...selectedUserIds, userId];
    
    onSelectionChange(newSelection);
  };

  const removeUser = (userId: string) => {
    onSelectionChange(selectedUserIds.filter(id => id !== userId));
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedUsers.length === 0 ? (
              placeholder
            ) : selectedUsers.length === 1 ? (
              selectedUsers[0].name
            ) : (
              `${selectedUsers.length} usuários selecionados`
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 bg-background border shadow-md z-50">
          <Command>
            <CommandInput placeholder="Buscar usuários..." />
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {users.map((user) => (
                <CommandItem
                  key={user.user_id}
                  onSelect={() => toggleUser(user.user_id)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUserIds.includes(user.user_id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getUserInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Tags dos usuários selecionados */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedUsers.map((user) => (
            <Badge key={user.user_id} variant="secondary" className="flex items-center gap-1 pl-2 pr-1">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-xs">
                  {getUserInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">{user.name}</span>
              <button
                type="button"
                onClick={() => removeUser(user.user_id)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}