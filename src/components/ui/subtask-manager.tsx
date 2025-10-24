import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";
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

  const toggleSubtask = (id: string) => {
    onChange(
      subtasks.map((st) =>
        st.id === id ? { ...st, completed: !st.completed } : st
      )
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSubtask();
    }
  };

  return (
    <div className="space-y-3">
      <Label>Subtarefas ({subtasks.length})</Label>
      
      {subtasks.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
              <Checkbox
                checked={subtask.completed}
                onCheckedChange={() => toggleSubtask(subtask.id)}
              />
              <span className={`text-sm flex-1 ${subtask.completed ? 'line-through text-muted-foreground' : ''}`}>
                {subtask.title}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSubtask(subtask.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={newSubtaskTitle}
          onChange={(e) => setNewSubtaskTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nova subtarefa..."
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addSubtask}
          disabled={!newSubtaskTitle.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
