import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SortableLeadCard } from './SortableLeadCard';
import { DropZoneIndicator } from '@/components/ui/drop-zone-indicator';

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  source: string;
  status: 'leads' | 'qualified' | 'scheduled' | 'meeting' | 'proposal' | 'won' | 'lost';
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

interface LeadKanbanColumnProps {
  id: string;
  title: string;
  leads: Lead[];
  color: string;
  count: number;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onView?: (lead: Lead) => void;
  onToggleVisibility?: () => void;
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
  onView,
  onToggleVisibility,
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
    <div className="space-y-4 min-w-[330px] w-[330px] flex-shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
        <div className={`w-3 h-3 ${color} rounded-full`}></div>
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="secondary">{count}</Badge>
        <div className="flex-1" />
        {onToggleVisibility && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-40 hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility();
            }}
            title="Ocultar coluna"
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[400px] max-h-[70vh] overflow-y-auto p-4 rounded-xl border-2 border-dashed transition-all duration-200 ${
          isOver 
            ? 'bg-primary/10 border-primary/50 shadow-lg scale-[1.02]' 
            : 'bg-muted/20 border-transparent hover:border-muted-foreground/20 hover:bg-muted/30'
        }`}
      >
        <SortableContext items={leads.map(lead => lead.id)} strategy={verticalListSortingStrategy}>
          {leads.length === 0 ? (
            <DropZoneIndicator isActive={isOver} isEmpty={true} title={title} />
          ) : (
            [...leads]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((lead) => (
                <SortableLeadCard
                  key={lead.id}
                  lead={lead}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                  getPriorityColor={getPriorityColor}
                  getPriorityLabel={getPriorityLabel}
                  getUrgencyLevel={getUrgencyLevel}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}