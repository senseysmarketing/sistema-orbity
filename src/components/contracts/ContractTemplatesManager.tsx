import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, FileText, Save, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContractTemplate {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const VARIABLE_GROUPS = [
  {
    label: "Cliente",
    vars: [
      "{{CLIENT_NAME}}",
      "{{CLIENT_DOCUMENT}}",
      "{{CLIENT_ADDRESS}}",
      "{{CLIENT_EMAIL}}",
      "{{CLIENT_PHONE}}",
    ],
  },
  {
    label: "Contrato",
    vars: ["{{CONTRACT_VALUE}}", "{{START_DATE}}", "{{END_DATE}}"],
  },
  {
    label: "Agência",
    vars: ["{{AGENCY_NAME}}", "{{AGENCY_DOCUMENT}}"],
  },
];

export default function ContractTemplatesManager() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();

  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentAgency?.id) return;
    fetchTemplates();
  }, [currentAgency?.id]);

  const fetchTemplates = async () => {
    if (!currentAgency?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("contract_templates")
      .select("*")
      .eq("agency_id", currentAgency.id)
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar modelos");
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  const handleNew = () => {
    setSelectedId(null);
    setName("");
    setContent("");
    setIsEditing(true);
  };

  const handleEdit = (t: ContractTemplate) => {
    setSelectedId(t.id);
    setName(t.name);
    setContent(t.content);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedId(null);
    setName("");
    setContent("");
  };

  const handleSave = async () => {
    if (!currentAgency?.id || !profile?.user_id) return;
    if (!name.trim()) {
      toast.error("Informe o nome do modelo");
      return;
    }
    if (!content.trim()) {
      toast.error("O conteúdo do modelo não pode estar vazio");
      return;
    }
    setSaving(true);
    if (selectedId) {
      const { error } = await supabase
        .from("contract_templates")
        .update({ name: name.trim(), content })
        .eq("id", selectedId);
      if (error) {
        toast.error("Erro ao salvar modelo");
        setSaving(false);
        return;
      }
      toast.success("Modelo atualizado");
    } else {
      const { error } = await supabase.from("contract_templates").insert({
        agency_id: currentAgency.id,
        created_by: profile.user_id,
        name: name.trim(),
        content,
      });
      if (error) {
        toast.error("Erro ao criar modelo");
        setSaving(false);
        return;
      }
      toast.success("Modelo criado");
    }
    setSaving(false);
    setIsEditing(false);
    setSelectedId(null);
    setName("");
    setContent("");
    fetchTemplates();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("contract_templates")
      .delete()
      .eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir modelo");
    } else {
      toast.success("Modelo excluído");
      if (selectedId === deleteId) handleCancel();
      fetchTemplates();
    }
    setDeleteId(null);
  };

  const copyVariable = async (v: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success("Variável copiada", { description: v });
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
      {/* Lista */}
      <div className="w-full lg:w-72 shrink-0 space-y-3">
        <Button onClick={handleNew} className="w-full" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Novo Modelo
        </Button>
        <div className="border border-border/60 rounded-md overflow-hidden">
          <ScrollArea className="h-[540px]">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Nenhum modelo cadastrado.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className={`group p-3 hover:bg-muted/40 cursor-pointer transition-colors ${
                      selectedId === t.id ? "bg-muted/60" : ""
                    }`}
                    onClick={() => handleEdit(t)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(t.updated_at), "dd MMM yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(t);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(t.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 border border-border/60 rounded-md p-6">
        {!isEditing ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-20">
            <FileText className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">
              Selecione um modelo à esquerda ou crie um novo para começar.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome do Modelo</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Contrato de Tráfego Padrão"
                className="border-border/60"
              />
            </div>

            {/* Variáveis Mágicas */}
            <div className="sticky top-0 z-10 bg-background border border-border/60 rounded-md p-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Variáveis Mágicas — clique para copiar
              </p>
              <div className="space-y-2">
                {VARIABLE_GROUPS.map((g) => (
                  <div key={g.label} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground w-16 shrink-0">
                      {g.label}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {g.vars.map((v) => (
                        <Badge
                          key={v}
                          variant="outline"
                          className="cursor-pointer font-mono text-[11px] hover:bg-muted border-border/60"
                          onClick={() => copyVariable(v)}
                        >
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-content">Conteúdo do Modelo</Label>
              <Textarea
                id="template-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Cole ou digite aqui o corpo do contrato. Use as variáveis acima como placeholders."
                className="min-h-[500px] font-mono text-sm leading-relaxed border-border/60"
                style={{ tabSize: 2 }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O modelo será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
