import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal, Edit, Trash2, Phone, Mail, Building, Calendar, DollarSign, Clock, Target, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LeadScoring } from "./LeadScoring";

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
    opacity: isDragging ? 0.8 : 1,
    scale: isDragging ? '1.05' : '1',
    zIndex: isDragging ? 999 : 1,
  };

  const urgency = getUrgencyLevel(lead);

  // Get card background based on urgency/status
  const getCardBackground = () => {
    if (urgency.level === 'urgent') {
      return 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900';
    }
    if (urgency.level === 'today') {
      return 'bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900';
    }
    if (lead.status === 'won') {
      return 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900';
    }
    if (lead.status === 'lost') {
      return 'bg-gray-50/50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-900';
    }
    return 'bg-card';
  };

  const isMetaAdsLead = lead.source === 'facebook_leads';

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
        getCardBackground()
      } ${
        isDragging 
          ? 'shadow-2xl border-primary/50 bg-background/95 rotate-3' 
          : 'hover:shadow-lg hover:scale-[1.02] hover:border-border/50'
      }`}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3">
        <div className="space-y-2.5">
          {/* Header with Name and Actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm leading-tight truncate">{lead.name}</h4>
              {lead.position && (
                <p className="text-xs text-muted-foreground truncate">{lead.position}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onEdit(lead)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive" 
                  onClick={() => onDelete(lead.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Badges */}
          <div className="flex gap-1 flex-wrap">
            <Badge className={getPriorityColor(lead.priority)} variant="secondary">
              {lead.priority === 'high' && '🔴'}
              {lead.priority === 'medium' && '🟡'}
              {lead.priority === 'low' && '🟢'} {getPriorityLabel(lead.priority)}
            </Badge>
            {urgency.level !== 'normal' && (
              <Badge className={urgency.color} variant="secondary">
                {urgency.level === 'urgent' && '⚠️'} {urgency.label}
              </Badge>
            )}
            {isMetaAdsLead && (
              <Badge className="bg-blue-600 text-white text-xs">
                📱 Meta Ads
              </Badge>
            )}
          </div>
          
          {/* Lead Information */}
          <div className="text-xs space-y-1.5">
            {lead.company && (
              <div className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                <span className="truncate">{lead.company}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-purple-500" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
                <span className="truncate">{lead.phone}</span>
              </div>
            )}
            {lead.next_contact && (
              <div className="flex items-center gap-1.5">
                <Calendar className={`h-3.5 w-3.5 flex-shrink-0 ${
                  urgency.level === 'urgent' ? 'text-red-500' : 
                  urgency.level === 'today' ? 'text-orange-500' : 'text-muted-foreground'
                }`} />
                <span className={urgency.level !== 'normal' ? 'font-medium' : ''}>
                  {formatDate(lead.next_contact)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground/70">
              <Target className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="capitalize">{lead.source}</span>
            </div>
          </div>

          {/* Value & Score */}
          {lead.value > 0 && (
            <div className="space-y-1 p-2 bg-muted/30 rounded-lg">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Valor Estimado</span>
                <span className="font-semibold text-green-600">{formatCurrency(lead.value)}</span>
              </div>
            </div>
          )}

          {/* Lead Score */}
          <div className="pt-1">
            <LeadScoring lead={lead} showLabel={false} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}