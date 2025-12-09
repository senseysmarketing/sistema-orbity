import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionItem {
  text: string;
  responsible?: string;
  deadline?: string;
  completed: boolean;
}

interface ActionItemRowProps {
  item: ActionItem;
  index: number;
  agencyMembers: Array<{ user_id: string; name: string }>;
  onUpdate: (index: number, field: keyof ActionItem, value: any) => void;
  onRemove: (index: number) => void;
}

export const ActionItemRow = ({
  item,
  index,
  agencyMembers,
  onUpdate,
  onRemove,
}: ActionItemRowProps) => {
  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-2 items-start p-2 rounded-md transition-colors",
        item.completed ? "bg-muted/50" : "bg-background"
      )}
    >
      <div className="col-span-1 flex items-center justify-center pt-2">
        <Checkbox
          checked={item.completed}
          onCheckedChange={(checked) => onUpdate(index, "completed", checked)}
        />
      </div>
      <div className="col-span-4">
        <Input
          placeholder="Descrição da ação"
          value={item.text}
          onChange={(e) => onUpdate(index, "text", e.target.value)}
          className={cn(
            "text-sm",
            item.completed && "line-through text-muted-foreground"
          )}
        />
      </div>
      <div className="col-span-3">
        <Select
          value={item.responsible || "none"}
          onValueChange={(value) => onUpdate(index, "responsible", value === "none" ? "" : value)}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem responsável</SelectItem>
            {agencyMembers.map((member) => (
              <SelectItem key={member.user_id} value={member.user_id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-3">
        <Input
          type="date"
          value={item.deadline || ""}
          onChange={(e) => onUpdate(index, "deadline", e.target.value)}
          className="text-sm"
          placeholder="Prazo"
        />
      </div>
      <div className="col-span-1 flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(index)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
