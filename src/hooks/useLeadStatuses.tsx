import { useState, useEffect } from "react";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";

interface LeadStatus {
  id: string;
  name: string;
  color: string;
  order_position: number;
  is_default: boolean;
  is_system?: boolean;
  agency_id: string;
  created_at: string;
  updated_at: string;
}

// Status padrão obrigatórios para relatórios e análises - NÃO PODEM SER EDITADOS/DELETADOS
const defaultStatuses: Omit<LeadStatus, 'id' | 'agency_id' | 'created_at' | 'updated_at'>[] = [
  { name: 'Leads', color: 'bg-blue-500', is_default: true, is_system: true, order_position: 1 },
  { name: 'Em contato', color: 'bg-sky-500', is_default: true, is_system: true, order_position: 2 },
  { name: 'Qualificados', color: 'bg-purple-500', is_default: true, is_system: true, order_position: 3 },
  { name: 'Agendamentos', color: 'bg-yellow-500', is_default: true, is_system: true, order_position: 4 },
  { name: 'Reuniões', color: 'bg-orange-500', is_default: true, is_system: true, order_position: 5 },
  { name: 'Propostas', color: 'bg-pink-500', is_default: true, is_system: true, order_position: 6 },
  { name: 'Vendas', color: 'bg-green-500', is_default: true, is_system: true, order_position: 7 },
];

export function useLeadStatuses() {
  const { currentAgency } = useAgency();
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStatuses = async () => {
    if (!currentAgency?.id) return;

    setLoading(true);
    try {
      const { data: customStatuses, error } = await supabase
        .from('lead_statuses')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .order('order_position', { ascending: true });

      if (error) throw error;

      // Se não há status customizados, criar os padrões
      if (!customStatuses || customStatuses.length === 0) {
        const defaultStatusesData = defaultStatuses.map((status, index) => ({
          agency_id: currentAgency.id,
          ...status,
        }));

        const { data: createdStatuses, error: createError } = await supabase
          .from('lead_statuses')
          .insert(defaultStatusesData)
          .select();

        if (createError) throw createError;
        setStatuses(createdStatuses as LeadStatus[]);
      } else {
        setStatuses(customStatuses as LeadStatus[]);
      }
    } catch (error) {
      console.error('Error fetching lead statuses:', error);
      // Fallback para status mockados em caso de erro
      const mockStatuses: LeadStatus[] = defaultStatuses.map((status, index) => ({
        id: `status-${index}`,
        agency_id: currentAgency.id,
        ...status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setStatuses(mockStatuses);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [currentAgency?.id]);

  // Map statuses to kanban configuration format
  const getStatusConfig = () => {
    const config: Record<string, { title: string; color: string; count: number }> = {};
    
    statuses
      .sort((a, b) => a.order_position - b.order_position)
      .forEach((status) => {
        // Use status name in lowercase and replace spaces with underscores for key
        const key = status.name.toLowerCase().replace(/\s+/g, '_').replace(/ç/g, 'c');
        config[key] = {
          title: status.name,
          color: status.color,
          count: 0
        };
      });
    
    return config;
  };

  // Get the status key for a given status name
  const getStatusKey = (statusName: string) => {
    return statusName.toLowerCase().replace(/\s+/g, '_').replace(/ç/g, 'c');
  };

  // Get status name from key
  const getStatusName = (key: string) => {
    const status = statuses.find(s => getStatusKey(s.name) === key);
    return status?.name || key;
  };

  // Map database status to display status (English to Portuguese)
  const mapDatabaseStatusToDisplay = (dbStatus: string) => {
    const statusMap: Record<string, string> = {
      'leads': 'Leads',
      'em_contato': 'Em contato',
      'qualified': 'Qualificados',
      'scheduled': 'Agendamentos',
      'meeting': 'Reuniões',
      'proposal': 'Propostas',
      'won': 'Vendas',
      'lost': 'Perdido',
      // Manter compatibilidade com antigos
      'new': 'Leads',
    };
    return statusMap[dbStatus] || dbStatus;
  };

  // Map display status to database status (Portuguese to English)
  const mapDisplayStatusToDatabase = (displayStatus: string) => {
    const statusMap: Record<string, string> = {
      'Leads': 'leads',
      'Em contato': 'em_contato',
      'Qualificados': 'qualified',
      'Agendamentos': 'scheduled',
      'Reuniões': 'meeting',
      'Propostas': 'proposal',
      'Vendas': 'won',
      'Perdido': 'lost',
    };
    return statusMap[displayStatus] || displayStatus;
  };

  return {
    statuses,
    loading,
    fetchStatuses,
    getStatusConfig,
    getStatusKey,
    getStatusName,
    mapDatabaseStatusToDisplay,
    mapDisplayStatusToDatabase,
    refresh: fetchStatuses
  };
}