import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Users, Target, DollarSign, AlertTriangle, TrendingUp, TrendingDown, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRMFunnelChart } from "./CRMFunnelChart";
import { CRMInvestmentMetrics } from "./CRMInvestmentMetrics";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useNavigate } from "react-router-dom";

interface Lead {
  id: string;
  status: string;
  priority: string;
  value: number;
  created_at: string;
  next_contact: string | null;
}

interface CRMDashboardProps {
  leads: Lead[];
}

export function CRMDashboard({ leads }: CRMDashboardProps) {
  const { currentAgency } = useAgency();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [investment, setInvestment] = useState(0);
  const [hasMetaIntegration, setHasMetaIntegration] = useState<boolean | null>(null);

  // Check if Meta integration is configured
  useEffect(() => {
    const checkIntegration = async () => {
      if (!currentAgency?.id) return;

      try {
        const { data: agency } = await supabase
          .from('agencies')
          .select('crm_ad_account_id')
          .eq('id', currentAgency.id)
          .single();

        setHasMetaIntegration(!!agency?.crm_ad_account_id);

        if (agency?.crm_ad_account_id) {
          const { data: account } = await supabase
            .from('selected_ad_accounts')
            .select('current_month_spend')
            .eq('id', agency.crm_ad_account_id)
            .single();

          if (account) {
            setInvestment(account.current_month_spend || 0);
          }
        }
      } catch (error) {
        console.error('Error checking integration:', error);
        setHasMetaIntegration(false);
      }
    };

    checkIntegration();
  }, [currentAgency?.id]);

  const metrics = useMemo(() => {
    const filteredLeads = leads.filter(lead => {
      const createdAt = new Date(lead.created_at);
      return createdAt >= dateRange.from && createdAt <= dateRange.to;
    });

    const totalLeads = filteredLeads.length;
    const wonLeads = filteredLeads.filter(l => l.status === 'won');
    const wonCount = wonLeads.length;
    const revenue = wonLeads.reduce((sum, l) => sum + (l.value || 0), 0);
    const conversionRate = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;

    // Compare with previous period
    const periodDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24));
    const previousFrom = new Date(dateRange.from.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousTo = new Date(dateRange.to.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const previousLeads = leads.filter(lead => {
      const createdAt = new Date(lead.created_at);
      return createdAt >= previousFrom && createdAt <= previousTo;
    });

    const previousTotal = previousLeads.length;
    const leadsGrowth = previousTotal > 0 ? ((totalLeads - previousTotal) / previousTotal) * 100 : 0;

    // Follow-ups
    const today = new Date().toISOString().split('T')[0];
    const followUpNeeded = filteredLeads.filter(lead => 
      lead.next_contact && lead.next_contact <= today && 
      !['won', 'lost'].includes(lead.status)
    ).length;

    // High priority
    const highPriority = filteredLeads.filter(l => 
      l.priority === 'high' && !['won', 'lost'].includes(l.status)
    ).length;

    return {
      totalLeads,
      conversionRate,
      revenue,
      followUpNeeded,
      highPriority,
      leadsGrowth,
    };
  }, [leads, dateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const quickPeriods = [
    { label: "Este Mês", from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
    { label: "Mês Passado", from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) },
    { label: "Últimos 3 Meses", from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) },
  ];

  return (
    <div className="space-y-6">
      {/* Meta Integration Alert */}
      {hasMetaIntegration === false && (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-amber-800 dark:text-amber-200">
              Configure sua integração com Meta Ads para acompanhar investimento e leads automaticamente.
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/dashboard/crm?tab=settings')}
              className="ml-4 shrink-0"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        {quickPeriods.map((period) => (
          <Button
            key={period.label}
            variant={dateRange.from.getTime() === period.from.getTime() ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange({ from: period.from, to: period.to })}
          >
            {period.label}
          </Button>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="ml-2">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
              locale={ptBR}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Quick Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLeads}</div>
            <div className="flex items-center gap-1 mt-1">
              {metrics.leadsGrowth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={cn("text-xs", metrics.leadsGrowth >= 0 ? "text-emerald-600" : "text-red-600")}>
                {metrics.leadsGrowth >= 0 ? '+' : ''}{metrics.leadsGrowth.toFixed(0)}% vs período anterior
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Leads convertidos em vendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Confirmada</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Leads ganhos no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atenção Necessária</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.followUpNeeded + metrics.highPriority}</div>
            <div className="flex gap-2 mt-1">
              {metrics.followUpNeeded > 0 && (
                <Badge variant="outline" className="text-xs">
                  {metrics.followUpNeeded} follow-ups
                </Badge>
              )}
              {metrics.highPriority > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {metrics.highPriority} alta prioridade
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Chart - Full Width */}
      <CRMFunnelChart leads={leads} dateRange={dateRange} />

      {/* Investment Metrics */}
      <CRMInvestmentMetrics 
        leads={leads} 
        investment={investment} 
        dateRange={dateRange} 
      />
    </div>
  );
}
