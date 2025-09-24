import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, Calendar, Users, TrendingDown, Bell } from "lucide-react";

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
}

export function CRMAlerts({ leads, onEdit }: CRMAlertsProps) {
  const [alerts, setAlerts] = useState({
    overdueFollowUp: [] as Lead[],
    todayFollowUp: [] as Lead[],
    highPriorityNew: [] as Lead[],
    coldLeads: [] as Lead[],
    staleLeads: [] as Lead[]
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

    setAlerts({
      overdueFollowUp,
      todayFollowUp,
      highPriorityNew,
      coldLeads,
      staleLeads
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-orange-500" />
          Alertas do CRM
          <Badge variant="destructive" className="ml-auto">
            {getTotalAlertsCount()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.overdueFollowUp.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Follow-ups em Atraso ({alerts.overdueFollowUp.length})</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {alerts.overdueFollowUp.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between bg-red-50 p-2 rounded border">
                    <div>
                      <span className="font-medium">{lead.name}</span>
                      {lead.company && <span className="text-sm text-muted-foreground ml-2">({lead.company})</span>}
                      <div className="text-xs text-red-600">
                        {getDaysOverdue(lead.next_contact!)} dias em atraso
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onEdit(lead)}>
                      Contatar
                    </Button>
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
            <Clock className="h-4 w-4" />
            <AlertTitle>Follow-ups para Hoje ({alerts.todayFollowUp.length})</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {alerts.todayFollowUp.slice(0, 3).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between bg-yellow-50 p-2 rounded border">
                    <div>
                      <span className="font-medium">{lead.name}</span>
                      {lead.company && <span className="text-sm text-muted-foreground ml-2">({lead.company})</span>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onEdit(lead)}>
                      Contatar
                    </Button>
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
            <Users className="h-4 w-4" />
            <AlertTitle>Leads de Alta Prioridade Novos ({alerts.highPriorityNew.length})</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {alerts.highPriorityNew.slice(0, 2).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between bg-orange-50 p-2 rounded border">
                    <div>
                      <span className="font-medium">{lead.name}</span>
                      {lead.company && <span className="text-sm text-muted-foreground ml-2">({lead.company})</span>}
                      <div className="text-xs text-orange-600">
                        Criado em {formatDate(lead.created_at)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onEdit(lead)}>
                      Qualificar
                    </Button>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {alerts.staleLeads.length > 0 && (
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertTitle>Leads Parados há +7 dias ({alerts.staleLeads.length})</AlertTitle>
            <AlertDescription>
              <div className="mt-2">
                <p className="text-sm text-muted-foreground mb-2">
                  Leads novos que não foram qualificados há mais de 7 dias
                </p>
                {alerts.staleLeads.slice(0, 2).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border mb-2">
                    <div>
                      <span className="font-medium">{lead.name}</span>
                      {lead.company && <span className="text-sm text-muted-foreground ml-2">({lead.company})</span>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onEdit(lead)}>
                      Revisar
                    </Button>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {alerts.coldLeads.length > 0 && (
          <Alert>
            <TrendingDown className="h-4 w-4" />
            <AlertTitle>Leads Frios (+30 dias) ({alerts.coldLeads.length})</AlertTitle>
            <AlertDescription>
              <p className="text-sm text-muted-foreground">
                Leads sem contato há mais de 30 dias. Considere uma campanha de reativação.
              </p>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}