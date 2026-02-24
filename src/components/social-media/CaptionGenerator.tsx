import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Sparkles, Loader2, ClipboardList, PenLine, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";
import { useAIAssist } from "@/hooks/useAIAssist";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TaskOption {
  id: string;
  title: string;
  description: string | null;
  platform: string | null;
  post_type: string | null;
  hashtags: string[] | null;
  creative_instructions: string | null;
  clientName: string | null;
  clientContact: string | null;
  clientService: string | null;
}

interface ClientOption {
  id: string;
  name: string;
  contact: string | null;
  service: string | null;
}

interface CaptionHistory {
  id: string;
  caption: string;
  hashtags: string[];
  cta_text: string;
  clientName: string | null;
  timestamp: Date;
}

const TONES = [
  { value: "profissional", label: "Profissional" },
  { value: "descontraido", label: "Descontraído" },
  { value: "inspiracional", label: "Inspiracional" },
  { value: "educativo", label: "Educativo" },
];

const PLATFORMS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
];

export function CaptionGenerator() {
  const { currentAgency } = useAgency();
  const { generateCaption, loading } = useAIAssist();
  const { toast } = useToast();

  const [mode, setMode] = useState<"task" | "free">("task");
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [freeDescription, setFreeDescription] = useState("");
  const [tone, setTone] = useState("profissional");
  const [platform, setPlatform] = useState("instagram");
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeCTA, setIncludeCTA] = useState(true);
  const [includeContact, setIncludeContact] = useState(false);

  const [generatedCaption, setGeneratedCaption] = useState("");
  const [history, setHistory] = useState<CaptionHistory[]>([]);

  // Load tasks
  useEffect(() => {
    if (!currentAgency?.id) return;
    const fetchTasks = async () => {
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title, description, platform, post_type, hashtags, creative_instructions")
        .eq("agency_id", currentAgency.id)
        .in("task_type", ["redes_sociais", "criativos"])
        .neq("status", "done")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!tasksData) return;

      const enriched: TaskOption[] = [];
      for (const t of tasksData) {
        let clientName: string | null = null;
        let clientContact: string | null = null;
        let clientService: string | null = null;

        const { data: tc } = await supabase
          .from("task_clients")
          .select("client_id")
          .eq("task_id", t.id)
          .limit(1)
          .maybeSingle();

        if (tc?.client_id) {
          const { data: c } = await supabase
            .from("clients")
            .select("name, contact, service")
            .eq("id", tc.client_id)
            .maybeSingle();
          if (c) {
            clientName = c.name;
            clientContact = c.contact;
            clientService = c.service;
          }
        }

        enriched.push({
          id: t.id,
          title: t.title,
          description: t.description,
          platform: t.platform,
          post_type: t.post_type,
          hashtags: t.hashtags as string[] | null,
          creative_instructions: t.creative_instructions,
          clientName,
          clientContact,
          clientService,
        });
      }
      setTasks(enriched);
    };
    fetchTasks();
  }, [currentAgency?.id]);

  // Load clients for free mode
  useEffect(() => {
    if (!currentAgency?.id) return;
    supabase
      .from("clients")
      .select("id, name, contact, service")
      .eq("agency_id", currentAgency.id)
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        if (data) setClients(data);
      });
  }, [currentAgency?.id]);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleGenerate = async () => {
    let contextPayload: Record<string, any> = {
      tone,
      platform,
      includeHashtags,
      includeCTA,
      includeContact,
    };

    if (mode === "task") {
      if (!selectedTask) {
        toast({ title: "Selecione uma tarefa", variant: "destructive" });
        return;
      }
      contextPayload = {
        ...contextPayload,
        mode: "task",
        title: selectedTask.title,
        description: selectedTask.description,
        taskPlatform: selectedTask.platform,
        postType: selectedTask.post_type,
        hashtags: selectedTask.hashtags,
        creativeInstructions: selectedTask.creative_instructions,
        clientName: selectedTask.clientName,
        clientContact: selectedTask.clientContact,
        clientService: selectedTask.clientService,
      };
    } else {
      if (!freeDescription.trim()) {
        toast({ title: "Descreva o que precisa", variant: "destructive" });
        return;
      }
      contextPayload = {
        ...contextPayload,
        mode: "free",
        description: freeDescription,
        clientName: selectedClient?.name || null,
        clientContact: selectedClient?.contact || null,
        clientService: selectedClient?.service || null,
      };
    }

    const result = await generateCaption(JSON.stringify(contextPayload), currentAgency?.id);
    if (result) {
      setGeneratedCaption(result.caption || "");
      const entry: CaptionHistory = {
        id: crypto.randomUUID(),
        caption: result.caption || "",
        hashtags: result.hashtags || [],
        cta_text: result.cta_text || "",
        clientName: mode === "task" ? selectedTask?.clientName || null : selectedClient?.name || null,
        timestamp: new Date(),
      };
      setHistory((prev) => [entry, ...prev]);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Legenda copiada para a área de transferência." });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerador de Legendas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === "task" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("task")}
              className="flex items-center gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              A partir de tarefa
            </Button>
            <Button
              variant={mode === "free" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("free")}
              className="flex items-center gap-2"
            >
              <PenLine className="h-4 w-4" />
              Descrição livre
            </Button>
          </div>

          {mode === "task" ? (
            <div className="space-y-2">
              <Label>Tarefa</Label>
              <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma tarefa..." />
                </SelectTrigger>
                <SelectContent>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title} {t.clientName ? `(${t.clientName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTask?.clientName && (
                <p className="text-xs text-muted-foreground">
                  Cliente: {selectedTask.clientName}
                  {selectedTask.clientService ? ` • ${selectedTask.clientService}` : ""}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva o conteúdo que precisa de legenda..."
                  value={freeDescription}
                  onChange={(e) => setFreeDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Cliente (opcional)</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <Separator />

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tom de voz</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plataforma</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={includeHashtags} onCheckedChange={(v) => setIncludeHashtags(!!v)} />
              Incluir hashtags
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={includeCTA} onCheckedChange={(v) => setIncludeCTA(!!v)} />
              Incluir CTA
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={includeContact} onCheckedChange={(v) => setIncludeContact(!!v)} />
              Incluir contato do cliente
            </label>
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Legenda
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Right: Result + History */}
      <div className="space-y-6">
        {/* Result */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="A legenda gerada aparecerá aqui..."
              value={generatedCaption}
              onChange={(e) => setGeneratedCaption(e.target.value)}
              rows={8}
              className="resize-y"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(generatedCaption)}
              disabled={!generatedCaption}
            >
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3">
                  {history.map((h) => (
                    <div key={h.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {h.clientName && (
                            <Badge variant="secondary" className="text-xs">
                              {h.clientName}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(h.timestamp, "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(h.caption)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">{h.caption}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
