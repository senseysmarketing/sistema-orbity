import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Phone, Mail, Building, Calendar, DollarSign } from "lucide-react";

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

interface SortableLeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  getPriorityColor: (priority: string) => string;
  getPriorityLabel: (priority: string) => string;
  getUrgencyLevel: (lead: Lead) => { level: string; label: string; color: string };
  formatCurrency: (value: number) => string;
  formatDate: (date: string | null) => string;
  isDragging?: boolean;
}

export function SortableLeadCard({
  lead,
  onEdit,
  onDelete,
  getPriorityColor,
  getPriorityLabel,
  getUrgencyLevel,
  formatCurrency,
  formatDate,
  isDragging = false,
}: SortableLeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const urgency = getUrgencyLevel(lead);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 rotate-2 shadow-lg' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{lead.name}</h4>
            {lead.company && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.company}</span>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(lead)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(lead.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex flex-wrap gap-1">
          <Badge 
            variant="outline" 
            className={`text-xs ${getPriorityColor(lead.priority)}`}
          >
            {getPriorityLabel(lead.priority)}
          </Badge>
          <Badge 
            variant="outline" 
            className={`text-xs ${urgency.color}`}
          >
            {urgency.label}
          </Badge>
        </div>

        {lead.email && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}

        {lead.phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}

        {lead.value > 0 && (
          <div className="flex items-center gap-1 text-xs font-medium text-green-600">
            <DollarSign className="h-3 w-3 flex-shrink-0" />
            <span>{formatCurrency(lead.value)}</span>
          </div>
        )}

        {lead.next_contact && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>Próximo: {formatDate(lead.next_contact)}</span>
          </div>
        )}

        {lead.tags && lead.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {lead.tags.slice(0, 2).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {lead.tags.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{lead.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Origem: {lead.source}
        </div>
      </CardContent>
    </Card>
  );
}