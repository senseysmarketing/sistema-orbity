import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface SubtaskManagerProps {
  subtasks: Subtask[];
  onChange: (subtasks: Subtask[]) => void;
}

interface SortableSubtaskItemProps {
  subtask: Subtask;
  onRemove: (id: string) => void;
}

function SortableSubtaskItem({ subtask, onRemove }: SortableSubtaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 bg-muted rounded ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm">{subtask.title}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(subtask.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function SubtaskManager({ subtasks, onChange }: SubtaskManagerProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = subtasks.findIndex((st) => st.id === active.id);
      const newIndex = subtasks.findIndex((st) => st.id === over.id);
      onChange(arrayMove(subtasks, oldIndex, newIndex));
    }
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={subtasks.map((st) => st.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mt-2 space-y-1 max-h-80 overflow-y-auto pr-1">
              {subtasks.map((subtask) => (
                <SortableSubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  onRemove={removeSubtask}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {subtasks.length} subtarefa{subtasks.length !== 1 ? 's' : ''}
            </p>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
