import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, Edit, Trash2, Phone, Mail, Building, Calendar, 
  DollarSign, Clock, Target, AlertTriangle,
  MessageCircle
} from "lucide-react";
// Calendar already imported above for Reunião button
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LeadScoring } from "./LeadScoring";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { LEAD_TEMPERATURES, LeadTemperature } from "@/lib/leadTemperature";
import { normalizeLeadStatusToDb } from "@/lib/crm/leadStatus";

// Mapeamento de tradução de origens de leads
const sourceTranslations: Record<string, string> = {
  'referral': 'Indicação',
  'facebook_leads': 'Facebook Ads',
  'instagram_leads': 'Instagram Ads',
  'google_ads': 'Google Ads',
  'website': 'Site',
  'landing_page': 'Landing Page',
  'cold_call': 'Prospecção Ativa',
  'email': 'E-mail',
  'whatsapp': 'WhatsApp',
  'linkedin': 'LinkedIn',
  'event': 'Evento',
  'other': 'Outro',
};

const translateSource = (source: string): string => {
  return sourceTranslations[source.toLowerCase()] || source;
};

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  source: string;
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

interface SortableLeadCardProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onView?: (lead: Lead) => void;
  onScheduleMeeting?: (lead: Lead) => void;
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
  onView,
  onScheduleMeeting,
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

  const { mapDatabaseStatusToDisplay, getStatusConfig } = useLeadStatuses();
  const statusConfig = getStatusConfig();
  const normalizedDbStatus = normalizeLeadStatusToDb(lead.status);
  const displayStatus = mapDatabaseStatusToDisplay(normalizedDbStatus);
  
  // Find status configuration
  const statusKey = Object.keys(statusConfig).find((key) =>
    statusConfig[key].title.toLowerCase() === String(displayStatus).toLowerCase()
  );
  const currentStatusConfig = statusKey ? statusConfig[statusKey] : null;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    scale: isDragging ? '1.05' : '1',
    zIndex: isDragging ? 999 : 1,
  };

  const urgency = getUrgencyLevel(lead);



  const handleClick = (e: React.MouseEvent) => {
    if (!isDragging) {
      onView?.(lead);
    }
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      // Remove caracteres não numéricos
      const phoneNumber = lead.phone.replace(/\D/g, '');
      // Abre WhatsApp em nova aba
      window.open(`https://wa.me/55${phoneNumber}`, '_blank');
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative"
    >
      <button
        type="button"
        aria-label="Arrastar"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded p-1 text-white/50 hover:text-white/80 cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Card
        className={`group transition-all duration-200 cursor-pointer select-none border-[#5a35a0] ${
          isDragging 
            ? 'shadow-2xl border-primary/50' 
            : 'hover:shadow-lg hover:shadow-purple-900/30 hover:scale-[1.02] hover:brightness-110'
        }`}
        style={{ backgroundColor: '#4c2882' }}
        onClick={handleClick}
      >
      <CardContent className="p-3">
        <div className="space-y-2.5">
          {/* Header with Name and Actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm leading-tight truncate text-white">{lead.name}</h4>
              {lead.position && (
                <p className="text-xs text-white/60 truncate">{lead.position}</p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0 text-white/70 hover:text-white">
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
            {currentStatusConfig && (
              <Badge variant="outline" className={`${currentStatusConfig.color.replace('bg-', 'bg-')} text-white text-xs border-0`}>
                {displayStatus}
              </Badge>
            )}
            {(() => {
              const temp = LEAD_TEMPERATURES[lead.temperature as LeadTemperature];
              const TempIcon = temp?.icon;
              return (
                <Badge variant="outline" className={`${temp?.color || 'bg-gray-500'} text-white text-xs border-0 flex items-center gap-1`}>
                  {TempIcon && <TempIcon className="h-3 w-3" />}
                  {temp?.label || lead.temperature}
                </Badge>
              );
            })()}
          </div>
          
          {/* Lead Information */}
          <div className="text-xs space-y-1.5 text-white/70">
            {lead.company && (
              <div className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 flex-shrink-0 text-white/50" />
                <span className="truncate">{lead.company}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-white/50" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-white/50" />
                <span className="truncate">{lead.phone}</span>
              </div>
            )}
            {lead.next_contact && (
              <div className="flex items-center gap-1.5">
                <Calendar className={`h-3.5 w-3.5 flex-shrink-0 ${
                  urgency.level === 'urgent' ? 'text-red-500' : 
                  urgency.level === 'today' ? 'text-orange-500' : 'text-white/50'
                }`} />
                <span className={urgency.level !== 'normal' ? 'font-medium' : ''}>
                  {formatDate(lead.next_contact)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-white/50">
              <Target className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="capitalize">{translateSource(lead.source)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-white/50">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {formatDistanceToNow(new Date(lead.created_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
            </div>
          </div>

          {/* Value */}
          {lead.value > 0 && (
            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs text-muted-foreground">Valor</span>
              </div>
              <span className="text-sm font-semibold text-green-600">{formatCurrency(lead.value)}</span>
            </div>
          )}

          {/* Action buttons — collapse to 0 height on desktop, expand on hover; always visible on mobile */}
          {(lead.phone || onScheduleMeeting) ? (
            <div
              className="grid transition-all duration-300 ease-out grid-rows-[1fr] opacity-100 md:grid-rows-[0fr] md:opacity-0 md:group-hover:grid-rows-[1fr] md:group-hover:opacity-100"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="overflow-hidden">
                <div className="flex gap-2 pt-1">
                  {lead.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs text-white/80 hover:text-white bg-transparent border-white/20 hover:bg-white/10"
                      onClick={(e) => { e.stopPropagation(); handleWhatsAppClick(e); }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                    </Button>
                  )}
                  {onScheduleMeeting && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs text-white/80 hover:text-white bg-transparent border-white/20 hover:bg-white/10"
                      onClick={(e) => { e.stopPropagation(); onScheduleMeeting(lead); }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <Calendar className="h-3.5 w-3.5 mr-1" /> Reunião
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-1">
              <LeadScoring lead={lead} showLabel={false} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}