import { useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";

export interface TaskType {
  id: string;
  agency_id: string;
  slug: string;
  name: string;
  icon: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

// Tipos padrão do sistema
const DEFAULT_TYPES: Omit<TaskType, "id" | "agency_id" | "created_at">[] = [
  { slug: "reuniao", name: "Reunião", icon: "📅", is_default: true, is_active: true },
  { slug: "design", name: "Design", icon: "🎨", is_default: true, is_active: true },
  { slug: "desenvolvimento", name: "Desenvolvimento", icon: "💻", is_default: true, is_active: true },
  { slug: "conteudo", name: "Conteúdo", icon: "✍️", is_default: true, is_active: true },
  { slug: "suporte", name: "Suporte", icon: "🛠️", is_default: true, is_active: true },
  { slug: "administrativo", name: "Administrativo", icon: "📋", is_default: true, is_active: true },
  { slug: "redes_sociais", name: "Redes Sociais", icon: "📱", is_default: true, is_active: true },
];

export function useTaskTypes() {
  const { currentAgency } = useAgency();
  const queryClient = useQueryClient();

  // Buscar tipos do banco
  const { data: dbTypes = [], isLoading, refetch } = useQuery({
    queryKey: ["task-types", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];

      const { data, error } = await supabase
        .from("task_types")
        .select("*")
        .eq("agency_id", currentAgency.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as TaskType[];
    },
    enabled: !!currentAgency?.id,
  });

  // Inicializar tipos padrão se não existirem
  const initializeDefaultTypes = useCallback(async () => {
    if (!currentAgency?.id || dbTypes.length > 0) return;

    try {
      const typesToInsert = DEFAULT_TYPES.map((type) => ({
        agency_id: currentAgency.id,
        slug: type.slug,
        name: type.name,
        icon: type.icon,
        is_default: type.is_default,
        is_active: type.is_active,
      }));

      const { error } = await supabase.from("task_types").insert(typesToInsert);

      if (error) throw error;
      refetch();
    } catch (error) {
      console.error("Erro ao inicializar tipos padrão:", error);
    }
  }, [currentAgency?.id, dbTypes.length, refetch]);

  // Mesclar tipos do banco com fallback para padrões
  const allTypes = useMemo(() => {
    if (dbTypes.length === 0) {
      // Retornar tipos padrão com IDs temporários
      return DEFAULT_TYPES.map((type, index) => ({
        ...type,
        id: `default-${index}`,
        agency_id: currentAgency?.id || "",
        created_at: new Date().toISOString(),
      }));
    }
    return dbTypes.filter((t) => t.is_active);
  }, [dbTypes, currentAgency?.id]);

  // Apenas tipos personalizados
  const customTypes = useMemo(() => {
    return dbTypes.filter((t) => !t.is_default && t.is_active);
  }, [dbTypes]);

  // Criar novo tipo
  const createTypeMutation = useMutation({
    mutationFn: async (data: { name: string; icon: string }) => {
      if (!currentAgency?.id) throw new Error("Agência não encontrada");

      const slug = data.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

      const { data: newType, error } = await supabase
        .from("task_types")
        .insert([{
          agency_id: currentAgency.id,
          slug,
          name: data.name,
          icon: data.icon || "📋",
          is_default: false,
          is_active: true,
        }])
        .select()
        .single();

      if (error) throw error;
      return newType;
    },
    onSuccess: () => {
      toast.success("Tipo de tarefa criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["task-types", currentAgency?.id] });
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Já existe um tipo com este nome.");
      } else {
        toast.error("Erro ao criar tipo de tarefa.");
      }
    },
  });

  // Atualizar tipo (ativar/desativar)
  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("task_types")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-types", currentAgency?.id] });
    },
    onError: () => {
      toast.error("Erro ao atualizar tipo de tarefa.");
    },
  });

  // Excluir tipo personalizado
  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("task_types")
        .delete()
        .eq("id", id)
        .eq("is_default", false); // Só permite excluir tipos personalizados

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipo de tarefa removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["task-types", currentAgency?.id] });
    },
    onError: () => {
      toast.error("Erro ao remover tipo de tarefa.");
    },
  });

  // Mapeamento de abreviações para tipos longos
  const SHORT_NAME_MAP: Record<string, string> = {
    "Desenvolvimento": "Desenv.",
    "Administrativo": "Admin.",
  };

  // Helpers
  const getTypeName = useCallback((slug: string | null): string => {
    if (!slug) return "Sem tipo";
    const type = allTypes.find((t) => t.slug === slug);
    return type?.name || slug;
  }, [allTypes]);

  const getTypeShortName = useCallback((slug: string | null): string => {
    if (!slug) return "Sem tipo";
    const type = allTypes.find((t) => t.slug === slug);
    const name = type?.name || slug;
    return SHORT_NAME_MAP[name] || name;
  }, [allTypes]);

  const getTypeIcon = useCallback((slug: string | null): string => {
    if (!slug) return "📋";
    const type = allTypes.find((t) => t.slug === slug);
    return type?.icon || "📋";
  }, [allTypes]);

  const isValidType = useCallback((slug: string): boolean => {
    return allTypes.some((t) => t.slug === slug);
  }, [allTypes]);

  return {
    types: allTypes,
    customTypes,
    defaultTypes: DEFAULT_TYPES,
    isLoading,
    initializeDefaultTypes,
    createType: createTypeMutation.mutateAsync,
    updateType: updateTypeMutation.mutateAsync,
    deleteType: deleteTypeMutation.mutateAsync,
    getTypeName,
    getTypeShortName,
    getTypeIcon,
    isValidType,
    refetch,
  };
}
