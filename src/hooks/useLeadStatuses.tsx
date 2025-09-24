import { useState, useEffect } from "react";
import { useAgency } from "@/hooks/useAgency";

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
  { name: 'Novo', color: 'bg-blue-500', is_default: true, is_system: true, order_position: 1 },
  { name: 'Qualificado', color: 'bg-orange-500', is_default: true, is_system: true, order_position: 2 },
  { name: 'Ganho', color: 'bg-green-500', is_default: true, is_system: true, order_position: 3 },
  { name: 'Perdido', color: 'bg-red-500', is_default: true, is_system: true, order_position: 4 },
];

export function useLeadStatuses() {
  const { currentAgency } = useAgency();
  const [statuses, setStatuses] = useState<LeadStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStatuses = async () => {
    if (!currentAgency?.id) return;

    setLoading(true);
    try {
      // For now, use mock data since the table is just created and types aren't updated yet
      const mockStatuses: LeadStatus[] = defaultStatuses.map((status, index) => ({
        id: `status-${index}`,
        agency_id: currentAgency.id,
        ...status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      
      setStatuses(mockStatuses);
    } catch (error) {
      console.error('Error fetching lead statuses:', error);
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
      'new': 'Novo',
      'qualified': 'Qualificado', 
      'won': 'Ganho',
      'lost': 'Perdido'
    };
    return statusMap[dbStatus] || dbStatus;
  };

  // Map display status to database status (Portuguese to English)
  const mapDisplayStatusToDatabase = (displayStatus: string) => {
    const statusMap: Record<string, string> = {
      'Novo': 'new',
      'Qualificado': 'qualified',
      'Ganho': 'won', 
      'Perdido': 'lost'
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