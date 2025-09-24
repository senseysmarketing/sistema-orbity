import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Clock } from "lucide-react";

interface Lead {
  id: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high';
  value: number;
  created_at: string;
  next_contact: string | null;
}

interface CRMMetricsProps {
  leads: Lead[];
}

export function CRMMetrics({ leads }: CRMMetricsProps) {
  const totalLeads = leads.length;
  const newLeads = leads.filter(lead => lead.status === 'new').length;
  const qualifiedLeads = leads.filter(lead => lead.status === 'qualified').length;
  const wonLeads = leads.filter(lead => lead.status === 'won').length;
  const lostLeads = leads.filter(lead => lead.status === 'lost').length;
  
  const totalValue = leads.reduce((sum, lead) => sum + (lead.value || 0), 0);
  const wonValue = leads
    .filter(lead => lead.status === 'won')
    .reduce((sum, lead) => sum + (lead.value || 0), 0);
  
  const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
  const averageValue = totalLeads > 0 ? totalValue / totalLeads : 0;
  
  // Leads with follow-up needed (next_contact is today or past)
  const today = new Date().toISOString().split('T')[0];
  const followUpNeeded = leads.filter(lead => 
    lead.next_contact && lead.next_contact <= today && 
    !['won', 'lost'].includes(lead.status)
  ).length;

  const metrics = [
    {
      title: "Total de Leads",
      value: totalLeads,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Novos Leads",
      value: newLeads,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Taxa de Conversão",
      value: `${conversionRate.toFixed(1)}%`,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Valor Total",
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(totalValue),
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Valor Médio",
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(averageValue),
      icon: TrendingUp,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Follow-up Necessário",
      value: followUpNeeded,
      icon: Clock,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            {metric.title === "Follow-up Necessário" && followUpNeeded > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Requer atenção imediata
              </p>
            )}
          </CardContent>
        </Card>
      ))}
      
      {/* Status Distribution */}
      <Card className="md:col-span-2 lg:col-span-3 xl:col-span-6">
        <CardHeader>
          <CardTitle className="text-lg">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Novos: {newLeads}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              Qualificados: {qualifiedLeads}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Ganhos: {wonLeads}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              Perdidos: {lostLeads}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}