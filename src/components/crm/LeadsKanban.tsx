import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { LeadKanbanColumn } from "./LeadKanbanColumn";
import { SortableLeadCard } from "./SortableLeadCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high';
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
}

const statusConfig = {
  new: { title: 'Novos', color: 'bg-blue-500', count: 0 },
  contacted: { title: 'Contatados', color: 'bg-yellow-500', count: 0 },
  qualified: { title: 'Qualificados', color: 'bg-orange-500', count: 0 },
  proposal: { title: 'Proposta', color: 'bg-purple-500', count: 0 },
  negotiation: { title: 'Negociação', color: 'bg-indigo-500', count: 0 },
  won: { title: 'Ganhos', color: 'bg-green-500', count: 0 },
  lost: { title: 'Perdidos', color: 'bg-red-500', count: 0 },
};

export function LeadsKanban({ leads, onEdit, onDelete, onUpdate }: LeadsKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return priority;
    }
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
    } else if (lead.priority === 'high') {
      return { level: 'high', label: 'Alta Prioridade', color: 'bg-orange-100 text-orange-800' };
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
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
      
      toast.success('Status do lead atualizado com sucesso');
      onUpdate();
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast.error('Erro ao atualizar status do lead');
    }

    setActiveId(null);
    setDraggedLead(null);
  };

  const groupedLeads = Object.keys(statusConfig).reduce((acc, status) => {
    acc[status] = leads.filter(lead => lead.status === status);
    return acc;
  }, {} as Record<string, Lead[]>);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-h-[600px] w-max min-w-full">
        {Object.entries(statusConfig).map(([status, config]) => (
          <LeadKanbanColumn
            key={status}
            id={status}
            title={config.title}
            leads={groupedLeads[status] || []}
            color={config.color}
            count={groupedLeads[status]?.length || 0}
            onEdit={onEdit}
            onDelete={onDelete}
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