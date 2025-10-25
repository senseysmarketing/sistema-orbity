import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, Calendar, Users, TrendingDown, Bell, DollarSign, Zap, Eye, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  priority: string;
  value: number;
  last_contact: string | null;
  next_contact: string | null;
  created_at: string;
}

interface CRMAlertsProps {
  leads: Lead[];
  onEdit: (lead: Lead) => void;
  onViewDetails: (lead: Lead) => void;
}

export function CRMAlerts({ leads, onEdit, onViewDetails }: CRMAlertsProps) {
  const [alerts, setAlerts] = useState({
    overdueFollowUp: [] as Lead[],
    todayFollowUp: [] as Lead[],
    highPriorityNew: [] as Lead[],
    coldLeads: [] as Lead[],
    staleLeads: [] as Lead[],
    highValueNoFollowUp: [] as Lead[],
    opportunitiesAtRisk: [] as Lead[],
    urgentAttention: [] as Lead[]
  });

  useEffect(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const overdueFollowUp = leads.filter(lead => {
      if (!lead.next_contact || ['won', 'lost'].includes(lead.status)) return false;
      const nextContact = new Date(lead.next_contact);
      return nextContact < yesterday;
    });

    const todayFollowUp = leads.filter(lead => {
      if (!lead.next_contact || ['won', 'lost'].includes(lead.status)) return false;
      const nextContact = new Date(lead.next_contact);
      return nextContact.toDateString() === today.toDateString();
    });

    const highPriorityNew = leads.filter(lead => 
      lead.status === 'new' && 
      lead.priority === 'high' && 
      new Date(lead.created_at) > sevenDaysAgo
    );

    const coldLeads = leads.filter(lead => {
      if (['won', 'lost'].includes(lead.status)) return false;
      if (!lead.last_contact) return false;
      const lastContact = new Date(lead.last_contact);
      return lastContact < thirtyDaysAgo;
    });

    const staleLeads = leads.filter(lead => {
      if (['won', 'lost'].includes(lead.status)) return false;
      const createdAt = new Date(lead.created_at);
      return createdAt < sevenDaysAgo && lead.status === 'new';
    });

    // Leads de alto valor sem follow-up agendado
    const highValueNoFollowUp = leads.filter(lead => {
      if (['won', 'lost'].includes(lead.status)) return false;
      return lead.value >= 5000 && !lead.next_contact;
    });

    // Oportunidades em risco: qualificados há mais de 14 dias sem conversão
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const opportunitiesAtRisk = leads.filter(lead => {
      if (lead.status !== 'qualified') return false;
      const createdAt = new Date(lead.created_at);
      return createdAt < fourteenDaysAgo;
    });

    // Leads que precisam de atenção urgente: alta prioridade + atrasados OU alto valor + parados
    const urgentAttention = leads.filter(lead => {
      if (['won', 'lost'].includes(lead.status)) return false;
      
      const isHighPriorityOverdue = lead.priority === 'high' && 
        lead.next_contact && 
        new Date(lead.next_contact) < yesterday;
      
      const isHighValueStale = lead.value >= 5000 && 
        lead.last_contact && 
        new Date(lead.last_contact) < sevenDaysAgo;
      
      return isHighPriorityOverdue || isHighValueStale;
    });

    setAlerts({
      overdueFollowUp,
      todayFollowUp,
      highPriorityNew,
      coldLeads,
      staleLeads,
      highValueNoFollowUp,
      opportunitiesAtRisk,
      urgentAttention
    });
  }, [leads]);

  const getTotalAlertsCount = () => {
    return Object.values(alerts).reduce((total, alertList) => total + alertList.length, 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysOverdue = (nextContact: string) => {
    const today = new Date();
    const contactDate = new Date(nextContact);
    const diffTime = today.getTime() - contactDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (getTotalAlertsCount() === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-green-500" />
            Alertas do CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground">Tudo em dia! Nenhum alerta no momento.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAlertPriority = () => {
    if (alerts.urgentAttention.length > 0) return 'urgent';
    if (alerts.overdueFollowUp.length > 0) return 'high';
    if (alerts.todayFollowUp.length > 0 || alerts.highPriorityNew.length > 0) return 'medium';
    return 'low';
  };

  const getTotalValue = (leadList: Lead[]) => {
    return leadList.reduce((sum, lead) => sum + (lead.value || 0), 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className={`h-5 w-5 ${getAlertPriority() === 'urgent' ? 'text-red-500' : getAlertPriority() === 'high' ? 'text-orange-500' : 'text-yellow-500'}`} />
          Alertas Inteligentes do CRM
          <Badge variant={getAlertPriority() === 'urgent' ? 'destructive' : 'secondary'} className="ml-auto">
            {getTotalAlertsCount()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alertas de Atenção Urgente */}
        {alerts.urgentAttention.length > 0 && (
          <Alert variant="destructive">
            <Zap className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              🚨 Atenção Urgente Necessária ({alerts.urgentAttention.length})
              <Badge variant="outline" className="bg-red-100">
                {formatCurrency(getTotalValue(alerts.urgentAttention))}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {alerts.urgentAttention.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{lead.name}</span>
                        {lead.priority === 'high' && (
                          <Badge variant="destructive" className="text-xs">Alta Prioridade</Badge>
                        )}
                      </div>
                      {lead.company && <span className="text-sm text-muted-foreground">({lead.company})</span>}
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Valor: {formatCurrency(lead.value)} • 
                        {lead.next_contact && new Date(lead.next_contact) < new Date() 
                          ? ` ${getDaysOverdue(lead.next_contact)} dias em atraso`
                          : ' Sem follow-up agendado'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onViewDetails(lead)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button size="sm" onClick={() => onEdit(lead)}>
                        Agir Agora
                      </Button>
                    </div>
                  </div>
                ))}
                {alerts.urgentAttention.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{alerts.urgentAttention.length - 3} mais leads precisando de atenção urgente
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Leads de Alto Valor sem Follow-up */}
        {alerts.highValueNoFollowUp.length > 0 && (
          <Alert>
            <DollarSign className="h-4 w-4 text-green-600" />
            <AlertTitle className="flex items-center gap-2">
              💰 Oportunidades de Alto Valor sem Follow-up ({alerts.highValueNoFollowUp.length})
              <Badge variant="outline" className="bg-green-100">
                {formatCurrency(getTotalValue(alerts.highValueNoFollowUp))}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {alerts.highValueNoFollowUp.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between bg-green-50 dark:bg-green-950/20 p-3 rounded border border-green-200">
                    <div className="flex-1">
                      <span className="font-medium">{lead.name}</span>
                      {lead.company && <span className="text-sm text-muted-foreground ml-2">({lead.company})</span>}
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Valor potencial: {formatCurrency(lead.value)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onViewDetails(lead)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Detalhes
                      </Button>
                      <Button size="sm" onClick={() => onEdit(lead)}>
                        Agendar Follow-up
                      </Button>
                    </div>
                  </div>
                ))}
                {alerts.highValueNoFollowUp.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{alerts.highValueNoFollowUp.length - 3} mais oportunidades de alto valor
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Oportunidades em Risco */}
        {alerts.opportunitiesAtRisk.length > 0 && (
          <Alert>
            <TrendingDown className="h-4 w-4 text-orange-600" />
            <AlertTitle className="flex items-center gap-2">
              ⚠️ Oportunidades em Risco ({alerts.opportunitiesAtRisk.length})
              <Badge variant="outline" className="bg-orange-100">
                {formatCurrency(getTotalValue(alerts.opportunitiesAtRisk))}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <p className="text-sm text-muted-foreground mb-2">
                Leads qualificados há mais de 14 dias sem conversão
              </p>
              <div className="space-y-2">
                {alerts.opportunitiesAtRisk.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/20 p-3 rounded border border-orange-200">
                    <div className="flex-1">
                      <span className="font-medium">{lead.name}</span>
                      {lead.company && <span className="text-sm text-muted-foreground ml-2">({lead.company})</span>}
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Qualificado há {Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias • {formatCurrency(lead.value)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onViewDetails(lead)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Revisar
                      </Button>
                      <Button size="sm" onClick={() => onEdit(lead)}>
                        Reativar
                      </Button>
                    </div>
                  </div>
                ))}
                {alerts.opportunitiesAtRisk.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{alerts.opportunitiesAtRisk.length - 3} mais oportunidades em risco
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Follow-ups em Atraso */}
        {alerts.overdueFollowUp.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Follow-ups em Atraso ({alerts.overdueFollowUp.length})</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {alerts.overdueFollowUp.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between bg-red-50 dark:bg-red-950/20 p-3 rounded border border-red-200">
                    <div className="flex-1">
                      <span className="font-medium">{lead.name}</span>
                      {lead.company && <span className="text-sm text-muted-foreground ml-2">({lead.company})</span>}
                      <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {getDaysOverdue(lead.next_contact!)} dias em atraso
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onViewDetails(lead)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button size="sm" onClick={() => onEdit(lead)}>
                        Contatar
                      </Button>
                    </div>
                  </div>
                ))}
                {alerts.overdueFollowUp.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{alerts.overdueFollowUp.length - 3} mais leads em atraso
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {alerts.todayFollowUp.length > 0 && (
          <Alert>
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertTitle>📅 Follow-ups para Hoje ({alerts.todayFollowUp.length})</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {alerts.todayFollowUp.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/20 p-3 rounded border border-blue-200">
                    <div className="flex-1">
                      <span className="font-medium">{lead.name}</span>
                      {lead.company && <span className="text-sm text-muted-foreground ml-2">({lead.company})</span>}
                      {lead.value > 0 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          Valor: {formatCurrency(lead.value)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onViewDetails(lead)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button size="sm" onClick={() => onEdit(lead)}>
                        Contatar
                      </Button>
                    </div>
                  </div>
                ))}
                {alerts.todayFollowUp.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{alerts.todayFollowUp.length - 3} mais follow-ups hoje
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {alerts.highPriorityNew.length > 0 && (
          <Alert>
            <Users className="h-4 w-4 text-purple-600" />
            <AlertTitle>⭐ Leads de Alta Prioridade Novos ({alerts.highPriorityNew.length})</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {alerts.highPriorityNew.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between bg-purple-50 dark:bg-purple-950/20 p-3 rounded border border-purple-200">
                    <div className="flex-1">
                      <span className="font-medium">{lead.name}</span>
                      {lead.company && <span className="text-sm text-muted-foreground ml-2">({lead.company})</span>}
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        Criado em {formatDate(lead.created_at)}
                        {lead.value > 0 && ` • ${formatCurrency(lead.value)}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => onViewDetails(lead)}>
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button size="sm" onClick={() => onEdit(lead)}>
                        Qualificar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {alerts.staleLeads.length > 0 && (
          <Alert>
            <Calendar className="h-4 w-4 text-gray-600" />
            <AlertTitle>⏸️ Leads Parados há +7 dias ({alerts.staleLeads.length})</AlertTitle>
            <AlertDescription>
              <div className="mt-2">
                <p className="text-sm text-muted-foreground mb-2">
                  Leads novos que não foram qualificados há mais de 7 dias
                </p>
                <div className="space-y-2">
                  {alerts.staleLeads.slice(0, 3).map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/20 p-3 rounded border mb-2">
                      <div className="flex-1">
                        <span className="font-medium">{lead.name}</span>
                        {lead.company && <span className="text-sm text-muted-foreground ml-2">({lead.company})</span>}
                        <div className="text-xs text-muted-foreground mt-1">
                          Criado há {Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias
                          {lead.value > 0 && ` • ${formatCurrency(lead.value)}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onViewDetails(lead)}>
                          <Eye className="h-3 w-3 mr-1" />
                          Detalhes
                        </Button>
                        <Button size="sm" onClick={() => onEdit(lead)}>
                          Revisar
                        </Button>
                      </div>
                    </div>
                  ))}
                  {alerts.staleLeads.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{alerts.staleLeads.length - 3} mais leads parados
                    </p>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {alerts.coldLeads.length > 0 && (
          <Alert>
            <TrendingDown className="h-4 w-4 text-gray-500" />
            <AlertTitle className="flex items-center gap-2">
              ❄️ Leads Frios (+30 dias) ({alerts.coldLeads.length})
              {getTotalValue(alerts.coldLeads) > 0 && (
                <Badge variant="outline" className="bg-gray-100">
                  {formatCurrency(getTotalValue(alerts.coldLeads))}
                </Badge>
              )}
            </AlertTitle>
            <AlertDescription>
              <p className="text-sm text-muted-foreground">
                Leads sem contato há mais de 30 dias. Considere uma campanha de reativação ou qualificação final.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}