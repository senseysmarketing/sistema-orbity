import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjects, Project } from "@/hooks/useProjects";
import { useAgency } from "@/hooks/useAgency";
import { useAIAssist } from "@/hooks/useAIAssist";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editProject?: Project | null;
}

const PROJECT_TYPES = [
  { value: "trafego", label: "Tráfego Pago" },
  { value: "social_media", label: "Social Media" },
  { value: "seo", label: "SEO" },
  { value: "branding", label: "Branding" },
  { value: "site", label: "Website" },
  { value: "outro", label: "Outro" },
];

export function ProjectFormDialog({ open, onOpenChange, editProject }: ProjectFormDialogProps) {
  const { createProject, updateProject } = useProjects();
  const { currentAgency } = useAgency();
  const { loading: aiLoading, preFillTask } = useAIAssist();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("outro");
  const [clientId, setClientId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [responsibleId, setResponsibleId] = useState<string>("");
  const [aiPrompt, setAiPrompt] = useState("");

  const clientsQuery = useQuery({
    queryKey: ["clients-select", currentAgency?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("id, name")
        .eq("agency_id", currentAgency!.id)
        .eq("active", true)
        .order("name");
      return data || [];
    },
    enabled: !!currentAgency?.id && open,
  });

  const membersQuery = useQuery({
    queryKey: ["members-select", currentAgency?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("agency_users")
        .select("user_id, profiles:user_id(name)")
        .eq("agency_id", currentAgency!.id);
      return (data || []) as any[];
    },
    enabled: !!currentAgency?.id && open,
  });

  useEffect(() => {
    if (editProject) {
      setName(editProject.name);
      setDescription(editProject.description || "");
      setProjectType(editProject.project_type);
      setClientId(editProject.client_id || "");
      setStartDate(editProject.start_date || "");
      setEndDate(editProject.end_date || "");
      setResponsibleId(editProject.responsible_id || "");
    } else {
      setName("");
      setDescription("");
      setProjectType("outro");
      setClientId("");
      setStartDate("");
      setEndDate("");
      setResponsibleId("");
    }
    setAiPrompt("");
  }, [editProject, open]);

  const handleAI = async () => {
    if (!aiPrompt.trim()) return;
    const result = await preFillTask(
      `Crie um projeto para agência de marketing digital: ${aiPrompt}. Responda em JSON com campos: title, description, priority (como project_type: trafego|social_media|seo|branding|site|outro)`,
      currentAgency?.id
    );
    if (result) {
      if (result.title) setName(result.title);
      if (result.description) setDescription(result.description);
      if (result.suggested_type) {
        const typeMap: Record<string, string> = {
          trafego: "trafego", social_media: "social_media", seo: "seo",
          branding: "branding", site: "site",
        };
        setProjectType(typeMap[result.suggested_type] || "outro");
      }
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    const payload: any = {
      name: name.trim(),
      description: description.trim() || null,
      project_type: projectType,
      client_id: clientId || null,
      start_date: startDate || null,
      end_date: endDate || null,
      responsible_id: responsibleId || null,
    };

    if (editProject) {
      updateProject.mutate({ id: editProject.id, ...payload }, {
        onSuccess: () => onOpenChange(false),
      });
    } else {
      createProject.mutate(payload, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editProject ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
        </DialogHeader>

        {/* AI Assist */}
        {!editProject && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Preenchimento com IA
            </Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Projeto de tráfego para cliente X por 3 meses"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="text-sm"
              />
              <Button size="sm" onClick={handleAI} disabled={aiLoading || !aiPrompt.trim()}>
                {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label>Nome do Projeto *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do projeto" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {(clientsQuery.data || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Responsável</Label>
            <Select value={responsibleId} onValueChange={setResponsibleId}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {(membersQuery.data || []).map((m: any) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profiles?.name || m.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || createProject.isPending || updateProject.isPending}
            >
              {editProject ? "Salvar" : "Criar Projeto"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
