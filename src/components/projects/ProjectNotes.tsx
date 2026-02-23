import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Send } from "lucide-react";
import { ProjectNote, useProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";

interface ProjectNotesProps {
  projectId: string;
  notes: ProjectNote[];
}

export function ProjectNotes({ projectId, notes }: ProjectNotesProps) {
  const { createNote, deleteNote } = useProjects();
  const { user } = useAuth();
  const [content, setContent] = useState("");

  const handleAdd = () => {
    if (!content.trim()) return;
    createNote.mutate({
      project_id: projectId,
      content: content.trim(),
      created_by: user?.id || null,
    });
    setContent("");
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva uma anotação..."
          rows={2}
          className="flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
          }}
        />
        <Button onClick={handleAdd} disabled={!content.trim()} size="icon" className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma anotação</p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div key={n.id} className="bg-muted/50 rounded-lg p-3 group">
              <div className="flex justify-between items-start">
                <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteNote.mutate(n.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {format(parseISO(n.created_at), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
