import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SubtaskManager, Subtask } from "@/components/ui/subtask-manager";
import { TaskTemplate, TaskTemplateFormData } from "@/hooks/useTaskTemplates";
import { useTaskStatuses } from "@/hooks/useTaskStatuses";
import { Save, X } from "lucide-react";

const TEMPLATE_ICONS = [
  "📋", "📝", "✅", "🎯", "🚀", "💼", "📊", "🔧", 
  "💡", "📌", "🗂️", "📁", "⭐", "🔥", "💪", "🎨"
];

const TEMPLATE_CATEGORIES = [
  "Geral",
  "Onboarding",
  "Campanha",
  "Produção",
  "Social Media",
  "Reunião",
  "Relatório",
  "Financeiro",
];

interface TaskTemplateFormProps {
  template?: TaskTemplate | null;
  onSubmit: (data: TaskTemplateFormData) => Promise<unknown>;
  onCancel: () => void;
}

export function TaskTemplateForm({ template, onSubmit, onCancel }: TaskTemplateFormProps) {
  const [loading, setLoading] = useState(false);
  const { statuses } = useTaskStatuses();
  const [formData, setFormData] = useState<TaskTemplateFormData>({
    name: "",
    description: "",
    category: "Geral",
    icon: "📋",
    default_title: "",
    default_description: "",
    default_priority: "medium",
    default_status: "todo",
    estimated_duration_hours: null,
    subtasks: [],
    auto_assign_creator: false,
    default_client_id: null,
    due_date_offset_days: null,
  });

  // Sync default status when statuses load
  useEffect(() => {
    if (!template && statuses.length > 0 && formData.default_status === "todo") {
      const defaultStatus = statuses.find(s => s.is_default)?.slug || statuses[0]?.slug || "todo";
      setFormData(prev => ({ ...prev, default_status: defaultStatus }));
    }
  }, [statuses, template]);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || "",
        category: template.category || "Geral",
        icon: template.icon || "📋",
        default_title: template.default_title || "",
        default_description: template.default_description || "",
        default_priority: template.default_priority || "medium",
        default_status: template.default_status || "todo",
        estimated_duration_hours: template.estimated_duration_hours,
        subtasks: template.subtasks || [],
        auto_assign_creator: template.auto_assign_creator || false,
        default_client_id: template.default_client_id,
        due_date_offset_days: template.due_date_offset_days,
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    setLoading(true);
    const result = await onSubmit(formData);
    setLoading(false);

    if (result) {
      onCancel();
    }
  };

  const handleSubtasksChange = (subtasks: Subtask[]) => {
    setFormData((prev) => ({ ...prev, subtasks }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Template Info Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Informações do Template</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Template *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Onboarding de Cliente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Ícone</Label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                  formData.icon === icon
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição do Template</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Descreva quando usar este template..."
            rows={2}
          />
        </div>
      </div>

      {/* Default Task Data Section */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="text-lg font-semibold">Dados da Tarefa</h3>

        <div className="space-y-2">
          <Label htmlFor="default_title">Título Padrão</Label>
          <Input
            id="default_title"
            value={formData.default_title}
            onChange={(e) => setFormData((prev) => ({ ...prev, default_title: e.target.value }))}
            placeholder="Ex: Reunião de Briefing - {cliente}"
          />
          <p className="text-xs text-muted-foreground">
            Use {"{cliente}"} para inserir o nome do cliente automaticamente
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="default_description">Descrição Padrão</Label>
          <Textarea
            id="default_description"
            value={formData.default_description}
            onChange={(e) => setFormData((prev) => ({ ...prev, default_description: e.target.value }))}
            placeholder="Descrição padrão da tarefa..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="default_status">Status</Label>
            <Select
              value={formData.default_status}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, default_status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.slug} value={status.slug}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${status.color}`} />
                      {status.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_priority">Prioridade</Label>
            <Select
              value={formData.default_priority}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, default_priority: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Subtasks Section */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="text-lg font-semibold">Subtarefas Pré-definidas</h3>
        <SubtaskManager 
          subtasks={formData.subtasks} 
          onChange={handleSubtasksChange} 
        />
      </div>

      {/* Automation Section */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="text-lg font-semibold">Automação</h3>

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <Label htmlFor="auto_assign_creator">Atribuir ao criador automaticamente</Label>
            <p className="text-sm text-muted-foreground">
              A tarefa será atribuída automaticamente ao usuário que a criar
            </p>
          </div>
          <Switch
            id="auto_assign_creator"
            checked={formData.auto_assign_creator}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, auto_assign_creator: checked }))}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !formData.name.trim()}>
          <Save className="h-4 w-4 mr-2" />
          {template ? "Salvar Alterações" : "Criar Template"}
        </Button>
      </div>
    </form>
  );
}
