import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";

export interface TaskStatus {
  id: string;
  slug: string;
  name: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  order_position: number;
}

// Status padrão do sistema
const DEFAULT_STATUSES: TaskStatus[] = [
  {
    id: "default-1",
    slug: "todo",
    name: "A Fazer",
    color: "bg-gray-500",
    is_default: true,
    is_active: true,
    order_position: 0,
  },
  {
    id: "default-2",
    slug: "in_progress",
    name: "Em Andamento",
    color: "bg-blue-500",
    is_default: true,
    is_active: true,
    order_position: 1,
  },
  {
    id: "default-3",
    slug: "em_revisao",
    name: "Em Revisão",
    color: "bg-purple-500",
    is_default: true,
    is_active: true,
    order_position: 2,
  },
  {
    id: "default-4",
    slug: "done",
    name: "Concluída",
    color: "bg-green-500",
    is_default: true,
    is_active: true,
    order_position: 3,
  },
];

export function useTaskStatuses() {
  const { currentAgency } = useAgency();

  // Buscar todos os status do banco (incluindo padrão)
  const { data: dbStatuses = [], isLoading } = useQuery({
    queryKey: ["task-statuses", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      
      const { data, error } = await supabase
        .from("task_statuses")
        .select("*")
        .eq("agency_id", currentAgency.id)
        .eq("is_active", true)
        .order("order_position");

      if (error) throw error;
      
      return (data || []).map((status) => ({
        id: status.id,
        slug: status.slug,
        name: status.name,
        color: status.color,
        is_default: status.is_default,
        is_active: status.is_active,
        order_position: status.order_position,
      }));
    },
    enabled: !!currentAgency?.id,
  });

  // Se não há status no banco, usar os padrão
  const allStatuses = useMemo(() => {
    if (dbStatuses.length === 0) {
      return DEFAULT_STATUSES;
    }
    return [...dbStatuses].sort((a, b) => a.order_position - b.order_position);
  }, [dbStatuses]);

  // Apenas os status personalizados (não padrão)
  const customOnlyStatuses = useMemo(() => {
    return dbStatuses.filter((s) => !s.is_default);
  }, [dbStatuses]);

  // Função para obter o nome de um status pelo slug
  const getStatusName = (slug: string): string => {
    const status = allStatuses.find((s) => s.slug === slug);
    return status?.name || slug;
  };

  // Função para obter a cor de um status pelo slug
  const getStatusColor = (slug: string): string => {
    const status = allStatuses.find((s) => s.slug === slug);
    return status?.color || "bg-gray-500";
  };

  // Função para verificar se um status é válido
  const isValidStatus = (slug: string): boolean => {
    return allStatuses.some((s) => s.slug === slug);
  };

  return {
    statuses: allStatuses,
    customStatuses: customOnlyStatuses,
    defaultStatuses: DEFAULT_STATUSES,
    isLoading,
    getStatusName,
    getStatusColor,
    isValidStatus,
  };
}
