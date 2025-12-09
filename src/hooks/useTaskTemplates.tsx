import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TaskTemplateSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskTemplate {
  id: string;
  agency_id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string;
  default_title: string | null;
  default_description: string | null;
  default_priority: string;
  estimated_duration_hours: number | null;
  subtasks: TaskTemplateSubtask[];
  auto_assign_creator: boolean;
  default_client_id: string | null;
  due_date_offset_days: number | null;
  is_active: boolean;
  usage_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskTemplateFormData {
  name: string;
  description: string;
  category: string;
  icon: string;
  default_title: string;
  default_description: string;
  default_priority: string;
  estimated_duration_hours: number | null;
  subtasks: TaskTemplateSubtask[];
  auto_assign_creator: boolean;
  default_client_id: string | null;
  due_date_offset_days: number | null;
}

export function useTaskTemplates() {
  const { currentAgency } = useAgency();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    if (!currentAgency?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("task_templates")
        .select("*")
        .eq("agency_id", currentAgency.id)
        .eq("is_active", true)
        .order("usage_count", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item) => ({
        ...item,
        subtasks: Array.isArray(item.subtasks) 
          ? (item.subtasks as unknown as TaskTemplateSubtask[])
          : [],
      }));

      setTemplates(formattedData);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
      toast.error("Erro ao carregar templates de tarefas");
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (formData: TaskTemplateFormData) => {
    if (!currentAgency?.id || !user?.id) {
      toast.error("Agência ou usuário não encontrado");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("task_templates")
        .insert([{
          agency_id: currentAgency.id,
          created_by: user.id,
          name: formData.name,
          description: formData.description || null,
          category: formData.category || null,
          icon: formData.icon || "📋",
          default_title: formData.default_title || null,
          default_description: formData.default_description || null,
          default_priority: formData.default_priority,
          estimated_duration_hours: formData.estimated_duration_hours,
          subtasks: JSON.parse(JSON.stringify(formData.subtasks)),
          auto_assign_creator: formData.auto_assign_creator,
          default_client_id: formData.default_client_id,
          due_date_offset_days: formData.due_date_offset_days,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Template criado com sucesso!");
      await fetchTemplates();
      return data;
    } catch (error) {
      console.error("Erro ao criar template:", error);
      toast.error("Erro ao criar template");
      return null;
    }
  };

  const updateTemplate = async (id: string, formData: TaskTemplateFormData) => {
    try {
      const { error } = await supabase
        .from("task_templates")
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category || null,
          icon: formData.icon || "📋",
          default_title: formData.default_title || null,
          default_description: formData.default_description || null,
          default_priority: formData.default_priority,
          estimated_duration_hours: formData.estimated_duration_hours,
          subtasks: JSON.parse(JSON.stringify(formData.subtasks)),
          auto_assign_creator: formData.auto_assign_creator,
          default_client_id: formData.default_client_id,
          due_date_offset_days: formData.due_date_offset_days,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Template atualizado com sucesso!");
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error("Erro ao atualizar template:", error);
      toast.error("Erro ao atualizar template");
      return false;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from("task_templates")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Template removido com sucesso!");
      await fetchTemplates();
      return true;
    } catch (error) {
      console.error("Erro ao remover template:", error);
      toast.error("Erro ao remover template");
      return false;
    }
  };

  const incrementUsageCount = async (id: string) => {
    try {
      const template = templates.find((t) => t.id === id);
      if (!template) return;

      await supabase
        .from("task_templates")
        .update({ usage_count: template.usage_count + 1 })
        .eq("id", id);
    } catch (error) {
      console.error("Erro ao incrementar contador:", error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [currentAgency?.id]);

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsageCount,
  };
}
