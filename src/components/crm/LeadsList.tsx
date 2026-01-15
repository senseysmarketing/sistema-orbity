import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, Building, Mail, Phone, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LEAD_TEMPERATURES, LeadTemperature } from "@/lib/leadTemperature";

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

interface LeadsListProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  onUpdate: () => void;
  onView?: (lead: Lead) => void;
}

export function LeadsList({ leads, onEdit, onDelete, onView }: LeadsListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'leads': return 'bg-blue-100 text-blue-800';
      case 'qualified': return 'bg-orange-100 text-orange-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'meeting': return 'bg-purple-100 text-purple-800';
      case 'proposal': return 'bg-pink-100 text-pink-800';
      case 'won': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'leads': return 'Novo Lead';
      case 'qualified': return 'Qualificado';
      case 'scheduled': return 'Agendamento';
      case 'meeting': return 'Reunião';
      case 'proposal': return 'Proposta';
      case 'won': return 'Ganho';
      case 'lost': return 'Perdido';
      default: return status;
    }
  };

  const getTemperatureColor = (temperature: string) => {
    const temp = LEAD_TEMPERATURES[temperature as LeadTemperature];
    return temp?.bgLight || 'bg-gray-100 text-gray-800';
  };

  const getTemperatureLabel = (temperature: string) => {
    const temp = LEAD_TEMPERATURES[temperature as LeadTemperature];
    return temp?.label || temperature;
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

  if (leads.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">Nenhum lead encontrado</p>
            <p className="text-muted-foreground">
              Comece adicionando seus primeiros leads
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Temperatura</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Próximo Contato</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="w-[70px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...leads]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{lead.name}</div>
                      {lead.position && (
                        <div className="text-sm text-muted-foreground">
                          {lead.position}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.company ? (
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{lead.company}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {lead.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lead.status)}>
                      {getStatusLabel(lead.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const temp = LEAD_TEMPERATURES[lead.temperature as LeadTemperature];
                      const TempIcon = temp?.icon;
                      return (
                        <Badge variant="outline" className={`${temp?.bgLight} flex items-center gap-1`}>
                          {TempIcon && <TempIcon className="h-3 w-3" />}
                          {temp?.label || lead.temperature}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    {lead.value > 0 ? (
                      <div className="flex items-center gap-1 font-medium text-green-600">
                        <DollarSign className="h-3 w-3" />
                        <span>{formatCurrency(lead.value)}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.next_contact ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{formatDate(lead.next_contact)}</span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {lead.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onView && (
                          <DropdownMenuItem onClick={() => onView(lead)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                        )}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}