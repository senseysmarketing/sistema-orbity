import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MessageSquare, Send, Phone, Mail, Video, FileText, Lightbulb, AlertCircle, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientTimelineProps {
  clientId: string;
}

const NOTE_TYPES = [
  { value: "note", label: "Nota", icon: FileText, color: "bg-blue-500" },
  { value: "call", label: "Ligação", icon: Phone, color: "bg-green-500" },
  { value: "email", label: "E-mail", icon: Mail, color: "bg-purple-500" },
  { value: "meeting", label: "Reunião", icon: Video, color: "bg-amber-500" },
  { value: "idea", label: "Ideia", icon: Lightbulb, color: "bg-yellow-500" },
  { value: "alert", label: "Alerta", icon: AlertCircle, color: "bg-red-500" },
];

export function ClientTimeline({ clientId }: ClientTimelineProps) {
  const queryClient = useQueryClient();
  const { currentAgency } = useAgency();
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("note");

  const { data: notes, isLoading } = useQuery({
    queryKey: ["client-notes", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_notes")
        .select(`
          *,
          profiles:created_by (name)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("client_notes").insert({
        client_id: clientId,
        agency_id: currentAgency?.id,
        created_by: user?.id,
        content,
        note_type: noteType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notes", clientId] });
      toast.success("Nota adicionada!");
      setContent("");
      setNoteType("note");
    },
    onError: () => toast.error("Erro ao adicionar nota"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-notes", clientId] });
      toast.success("Nota removida!");
    },
    onError: () => toast.error("Erro ao remover nota"),
  });

  const getTypeData = (type: string) => {
    return NOTE_TYPES.find((t) => t.value === type) || NOTE_TYPES[0];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Add Note Form */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {profile?.name ? getInitials(profile.name) : "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="Adicione uma nota, registro de ligação, ideia..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center justify-between">
                <Select value={noteType} onValueChange={setNoteType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!content.trim() || createMutation.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24" />
            </Card>
          ))}
        </div>
      ) : !notes?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhuma nota registrada</h3>
            <p className="text-muted-foreground text-center">
              Adicione notas, registros de ligações e ideias sobre o cliente
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {notes.map((note) => {
              const typeData = getTypeData(note.note_type || "note");
              const TypeIcon = typeData.icon;
              const authorName = (note.profiles as any)?.name || "Usuário";

              return (
                <div key={note.id} className="relative pl-10 group">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2 top-4 h-5 w-5 rounded-full ${typeData.color} flex items-center justify-center ring-4 ring-background`}
                  >
                    <TypeIcon className="h-3 w-3 text-white" />
                  </div>

                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(authorName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{authorName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {typeData.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(note.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                          {note.created_by === user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={() => deleteMutation.mutate(note.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(note.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
