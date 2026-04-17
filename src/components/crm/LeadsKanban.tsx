import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, MouseSensor, TouchSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeadKanbanColumn } from "./LeadKanbanColumn";
import { SortableLeadCard } from "./SortableLeadCard";
import { LossReasonDialog } from "./LossReasonDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { getTemperatureLabel } from "@/lib/leadTemperature";
import { normalizeLeadStatusToDb } from "@/lib/crm/leadStatus";
import { firePipelineMetaEvent } from "@/lib/metaPipelineEvents";
import { useAgency } from "@/hooks/useAgency";

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
  onScheduleMeeting?: (lead: Lead) => void;
  onLeadMove?: (leadId: string, newStatus: string) => void;
  hiddenColumns?: Set<string>;
  onToggleColumn?: (columnId: string) => void;
  onShowAllColumns?: () => void;
}

export function LeadsKanban({ leads, onEdit, onDelete, onUpdate, onView, onScheduleMeeting, onLeadMove, hiddenColumns, onToggleColumn, onShowAllColumns }: LeadsKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [pendingLossLead, setPendingLossLead] = useState<{ id: string; name: string; dbStatus: string; displayStatus: string } | null>(null);
  const { getStatusConfig, getStatusKey, mapDatabaseStatusToDisplay, mapDisplayStatusToDatabase } = useLeadStatuses();
  const { currentAgency } = useAgency();

  const statusConfig = getStatusConfig();

  // Normaliza valores legados/variantes de status para o formato que o Kanban usa (dbStatus).
  // Exemplos:
  // - dbStatus: "scheduled" -> "scheduled"
  // - statusKey antigo: "agendamentos" -> "scheduled"
  // - display name: "Agendamentos" -> "scheduled"
  const normalizeStatusToDb = (rawStatus: string) => {
    if (!rawStatus) return 'leads';

    // 0) Primeiro, normaliza o que for padrão/legado/PT-BR conhecido.
    const canonicalOrSame = normalizeLeadStatusToDb(rawStatus);
    // Se virou canônico (ex.: "vendas" -> "won"), já retorna.
    if (canonicalOrSame !== rawStatus && typeof canonicalOrSame === 'string') {
      return canonicalOrSame;
    }

    // 0) Compatibilidade: se veio como dbStatus legado (ex.: "new"), converte via mapeadores.
    // Ex.: "new" -> "Leads" -> "leads"
    const displayFromDb = mapDatabaseStatusToDisplay(rawStatus);
    if (displayFromDb !== rawStatus) {
      return mapDisplayStatusToDatabase(displayFromDb);
    }

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
        delay: 200,
        tolerance: 8,
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
    let newStatus = over.id as string;
    
    // Check if it's a valid status column; if not, resolve via sortable container
    if (!statusConfig[newStatus as keyof typeof statusConfig]) {
      const containerId = over.data?.current?.sortable?.containerId;
      if (containerId && statusConfig[containerId as keyof typeof statusConfig]) {
        newStatus = containerId as string;
      } else {
        setActiveId(null);
        setDraggedLead(null);
        return;
      }
    }

    const lead = leads.find(l => l.id === leadId);
    if (!lead) {
      setActiveId(null);
      setDraggedLead(null);
      return;
    }

    // Convert status key back to database format
    const displayStatus = statusConfig[newStatus].title;
    const dbStatus = mapDisplayStatusToDatabase(displayStatus);
    
    // Compare normalized current status with target to avoid no-op moves
    const currentNormalized = normalizeStatusToDb(lead.status);
    if (currentNormalized.toLowerCase() === dbStatus.toLowerCase()) {
      setActiveId(null);
      setDraggedLead(null);
      return;
    }

    try {
      // If moving to "lost", open loss reason dialog instead
      if (dbStatus === 'lost') {
        setPendingLossLead({ id: leadId, name: lead.name, dbStatus, displayStatus });
        setLossDialogOpen(true);
        setActiveId(null);
        setDraggedLead(null);
        return;
      }
      
      // Update local cache immediately (optimistic update)
      if (onLeadMove) {
        onLeadMove(leadId, dbStatus);
      }
      
      // Update in background - only status, NOT temperature
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: dbStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
      
      // Fire Meta pipeline event in background
      if (currentAgency?.id) {
        firePipelineMetaEvent(leadId, currentAgency.id, dbStatus, lead.value);
      }
      
      toast.success(`Lead movido para ${displayStatus}`);
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Erro ao atualizar status do lead');
      // On error, refresh to get correct state
      onUpdate();
    }

    setActiveId(null);
    setDraggedLead(null);
  };

  const handleLossConfirm = async (reason: string, notes?: string) => {
    if (!pendingLossLead) return;
    
    try {
      if (onLeadMove) {
        onLeadMove(pendingLossLead.id, 'lost');
      }

      const lossReason = reason === 'outro' && notes ? `outro: ${notes}` : reason;
      
      const { error } = await supabase
        .from('leads')
        .update({
          status: 'lost',
          loss_reason: lossReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pendingLossLead.id);

      if (error) throw error;
      
      toast.success(`Lead "${pendingLossLead.name}" marcado como Perdido`);
    } catch (error) {
      console.error('Error updating lead to lost:', error);
      toast.error('Erro ao atualizar status do lead');
      onUpdate();
    } finally {
      setLossDialogOpen(false);
      setPendingLossLead(null);
    }
  };

  const handleLossCancel = () => {
    setLossDialogOpen(false);
    setPendingLossLead(null);
    onUpdate(); // refresh to revert optimistic changes
  };

  const groupedLeads = Object.keys(statusConfig).reduce((acc, statusKey) => {
    const displayStatus = statusConfig[statusKey].title;
    const dbStatus = mapDisplayStatusToDatabase(displayStatus);
    acc[statusKey] = leads.filter(lead => {
      const normalized = normalizeStatusToDb(lead.status);
      // Comparação case-insensitive para suportar status customizados
      return normalized.toLowerCase() === dbStatus.toLowerCase();
    });
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
              onScheduleMeeting={onScheduleMeeting}
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
            onScheduleMeeting={onScheduleMeeting}
            getPriorityColor={getPriorityColor}
            getPriorityLabel={getPriorityLabel}
            getUrgencyLevel={getUrgencyLevel}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            isDragging={true}
          />
        ) : null}
      </DragOverlay>

      <LossReasonDialog
        open={lossDialogOpen}
        leadName={pendingLossLead?.name || ""}
        onConfirm={handleLossConfirm}
        onCancel={handleLossCancel}
      />
    </DndContext>
  );
}