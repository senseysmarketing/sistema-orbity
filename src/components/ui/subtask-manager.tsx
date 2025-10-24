import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, List } from "lucide-react";
import { Label } from "@/components/ui/label";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface SubtaskManagerProps {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
}

export function SubtaskManager({ subtasks, onChange }: SubtaskManagerProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const addSubtask = () => {
    if (newSubtaskTitle.trim()) {
      const newSubtask: Subtask = {
        id: crypto.randomUUID(),
        title: newSubtaskTitle.trim(),
        completed: false,
      };
      onChange([...subtasks, newSubtask]);
      setNewSubtaskTitle("");
    }
  };

  const removeSubtask = (id: string) => {
    onChange(subtasks.filter((st) => st.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubtask();
    }
  };

  return (
    <div>
      <Label>Subtarefas</Label>
      <div className="flex gap-2 mt-2">
        <Input
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Adicionar subtarefa..."
        />
        <Button type="button" size="icon" onClick={addSubtask}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {subtasks.length > 0 && (
        <div className="mt-2 space-y-1">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-2 p-2 bg-muted rounded">
              <List className="h-4 w-4" />
              <span className="flex-1 text-sm">{subtask.title}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSubtask(subtask.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
