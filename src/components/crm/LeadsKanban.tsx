import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeadKanbanColumn } from "./LeadKanbanColumn";
import { SortableLeadCard } from "./SortableLeadCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { getTemperatureForStatus, getTemperatureLabel, LEAD_TEMPERATURES } from "@/lib/leadTemperature";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  source: string;
  // Status é string no banco (suporta etapas padrão e personalizadas)
  status: string;
  temperature: 'cold' | 'warm' | 'hot';
  value: number;
  notes: string | null;
  assigned_to: string | null;
  last_contact: string | null;
  next_contact: string | null;
  tags: string[] | null;
  custom_fields: any;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface LeadsKanbanProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onUpdate: () => void;
  onView?: (lead: Lead) => void;
  onLeadMove?: (leadId: string, newStatus: string) => void;
  hiddenColumns?: Set<string>;
  onToggleColumn?: (columnId: string) => void;
  onShowAllColumns?: () => void;
}

export function LeadsKanban({ leads, onEdit, onDelete, onUpdate, onView, onLeadMove, hiddenColumns, onToggleColumn, onShowAllColumns }: LeadsKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const { getStatusConfig, getStatusKey, mapDatabaseStatusToDisplay, mapDisplayStatusToDatabase } = useLeadStatuses();

  const statusConfig = getStatusConfig();

  // Normaliza valores legados/variantes de status para o formato que o Kanban usa (dbStatus).
  // Exemplos:
  // - dbStatus: "scheduled" -> "scheduled"
  // - statusKey antigo: "agendamentos" -> "scheduled"
  // - display name: "Agendamentos" -> "scheduled"
  const normalizeStatusToDb = (rawStatus: string) => {
    if (!rawStatus) return 'leads';

    // 1) Se veio como statusKey (ex.: agendamentos) e existe no config, converte via título.
    if (statusConfig[rawStatus as keyof typeof statusConfig]) {
      const display = statusConfig[rawStatus as keyof typeof statusConfig].title;
      return mapDisplayStatusToDatabase(display);
    }

    // 2) Se veio como display name (ex.: Agendamentos), tenta casar pelo título.
    const byTitle = Object.values(statusConfig).find(
      (c) => c.title.toLowerCase() === rawStatus.toLowerCase()
    );
    if (byTitle) return mapDisplayStatusToDatabase(byTitle.title);

    // 3) Caso padrão: assume que já é dbStatus ou um status custom (string livre).
    return rawStatus;
  };
  
  // Filter visible columns based on hiddenColumns
  const visibleColumns = Object.entries(statusConfig).filter(
    ([statusKey]) => !hiddenColumns?.has(statusKey)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
        tolerance: 5,
      },
    })
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'hot': return 'bg-red-100 text-red-800 border-red-200';
      case 'warm': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cold': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    return getTemperatureLabel(priority);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getUrgencyLevel = (lead: Lead) => {
    const today = new Date();
    const nextContact = lead.next_contact ? new Date(lead.next_contact) : null;
    
    if (nextContact && nextContact < today) {
      return { level: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-800' };
    } else if (nextContact && nextContact.getTime() - today.getTime() <= 86400000) {
      return { level: 'today', label: 'Hoje', color: 'bg-yellow-100 text-yellow-800' };
    } else if (lead.temperature === 'hot') {
      return { level: 'high', label: 'Quente', color: 'bg-orange-100 text-orange-800' };
    }
    return { level: 'normal', label: 'Normal', color: 'bg-gray-100 text-gray-800' };
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    
    const lead = leads.find(l => l.id === active.id);
    setDraggedLead(lead || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !active.id) {
      setActiveId(null);
      setDraggedLead(null);
      return;
    }

    const leadId = active.id as string;
    const newStatus = over.id as string;
    
    // Check if it's a valid status
    if (!statusConfig[newStatus as keyof typeof statusConfig]) {
      setActiveId(null);
      setDraggedLead(null);
      return;
    }

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === newStatus) {
      setActiveId(null);
      setDraggedLead(null);
      return;
    }

    try {
      // Convert status key back to database format
      const displayStatus = statusConfig[newStatus].title;
      const dbStatus = mapDisplayStatusToDatabase(displayStatus);
      
      // Calculate new temperature based on status
      const newTemperature = getTemperatureForStatus(dbStatus);
      const tempConfig = LEAD_TEMPERATURES[newTemperature];
      
      // Update local cache immediately (optimistic update)
      if (onLeadMove) {
        onLeadMove(leadId, dbStatus);
      }
      
      // Update in background without blocking UI
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: dbStatus,
          temperature: newTemperature,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
      
      toast.success(`Lead movido para ${displayStatus} • ${tempConfig.emoji} ${tempConfig.label}`);
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Erro ao atualizar status do lead');
      // On error, refresh to get correct state
      onUpdate();
    }

    setActiveId(null);
    setDraggedLead(null);
  };

  const groupedLeads = Object.keys(statusConfig).reduce((acc, statusKey) => {
    const displayStatus = statusConfig[statusKey].title;
    const dbStatus = mapDisplayStatusToDatabase(displayStatus);
    acc[statusKey] = leads.filter(lead => normalizeStatusToDb(lead.status) === dbStatus);
    return acc;
  }, {} as Record<string, Lead[]>);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="space-y-4">
        {/* Hidden columns indicator */}
        {hiddenColumns && hiddenColumns.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/30">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {hiddenColumns.size} coluna{hiddenColumns.size > 1 ? 's' : ''} oculta{hiddenColumns.size > 1 ? 's' : ''}
            </span>
            <Button 
              variant="link" 
              size="sm" 
              className="text-primary h-auto p-0"
              onClick={onShowAllColumns}
            >
              Mostrar todas
            </Button>
          </div>
        )}
        
        <div className="flex gap-4 overflow-x-auto pb-4">
          {visibleColumns.map(([statusKey, config]) => (
            <LeadKanbanColumn
              key={statusKey}
              id={statusKey}
              title={config.title}
              leads={groupedLeads[statusKey] || []}
              color={config.color}
              count={groupedLeads[statusKey]?.length || 0}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              onToggleVisibility={() => onToggleColumn?.(statusKey)}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              getUrgencyLevel={getUrgencyLevel}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeId && draggedLead ? (
          <SortableLeadCard
            lead={draggedLead}
            onEdit={onEdit}
            onDelete={onDelete}
            getPriorityColor={getPriorityColor}
            getPriorityLabel={getPriorityLabel}
            getUrgencyLevel={getUrgencyLevel}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            isDragging={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}