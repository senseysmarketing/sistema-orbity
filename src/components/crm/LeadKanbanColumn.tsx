import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from "@/components/ui/badge";
import { SortableLeadCard } from './SortableLeadCard';

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

interface LeadKanbanColumnProps {
  id: string;
  title: string;
  leads: Lead[];
  color: string;
  count: number;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  getPriorityColor: (priority: string) => string;
  getPriorityLabel: (priority: string) => string;
  getUrgencyLevel: (lead: Lead) => { level: string; label: string; color: string };
  formatCurrency: (value: number) => string;
  formatDate: (date: string | null) => string;
}

export function LeadKanbanColumn({
  id,
  title,
  leads,
  color,
  count,
  onEdit,
  onDelete,
  getPriorityColor,
  getPriorityLabel,
  getUrgencyLevel,
  formatCurrency,
  formatDate,
}: LeadKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
        <div className={`w-3 h-3 ${color} rounded-full`}></div>
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary">{count}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-32 max-h-[70vh] overflow-y-auto p-2 rounded-lg transition-colors ${
          isOver ? 'bg-muted/50' : ''
        }`}
      >
        <SortableContext items={leads.map(lead => lead.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <SortableLeadCard
              key={lead.id}
              lead={lead}
              onEdit={onEdit}
              onDelete={onDelete}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              getUrgencyLevel={getUrgencyLevel}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}