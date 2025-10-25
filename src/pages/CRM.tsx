import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Users, DollarSign, Target, Calendar, Webhook, Grid, List, AlertTriangle, TrendingUp, Activity, Eye, Settings, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeadsKanban } from "@/components/crm/LeadsKanban";
import { LeadsList } from "@/components/crm/LeadsList";
import { LeadForm } from "@/components/crm/LeadForm";
import { LeadDetailsDialog } from "@/components/crm/LeadDetailsDialog";
import { WebhooksManager } from "@/components/crm/WebhooksManager";
import { CRMAlerts } from "@/components/crm/CRMAlerts";
import { CustomStatusManager } from "@/components/crm/CustomStatusManager";
import { CRMAdvancedFilters } from "@/components/crm/CRMAdvancedFilters";
import { CRMAnalytics } from "@/components/crm/CRMAnalytics";
import { CRMMetrics } from "@/components/crm/CRMMetrics";
import { FacebookLeadsIntegration } from "@/components/crm/FacebookLeadsIntegration";
import { CRMSettings } from "@/components/crm/CRMSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { toast } from "sonner";

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

export default function CRM() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { refresh: refreshStatuses } = useLeadStatuses();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    status: [] as string[],
    priority: [] as string[],
    source: [] as string[],
    assignedTo: [] as string[],
    valueRange: { min: null as number | null, max: null as number | null },
    dateRange: { from: null as Date | null, to: null as Date | null },
    tags: [] as string[],
    hasNextContact: null as boolean | null,
    followUpOverdue: null as boolean | null,
  });

  const fetchLeads = async () => {
    if (!currentAgency?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data || []) as Lead[]);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [currentAgency?.id]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = searchQuery === '' || 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;

      // Advanced filters
      const matchesAdvancedStatus = advancedFilters.status.length === 0 || advancedFilters.status.includes(lead.status);
      const matchesAdvancedPriority = advancedFilters.priority.length === 0 || advancedFilters.priority.includes(lead.priority);
      const matchesAdvancedSource = advancedFilters.source.length === 0 || advancedFilters.source.includes(lead.source);
      
      const matchesValueRange = 
        (advancedFilters.valueRange.min === null || lead.value >= advancedFilters.valueRange.min) &&
        (advancedFilters.valueRange.max === null || lead.value <= advancedFilters.valueRange.max);

      const matchesDateRange = 
        (!advancedFilters.dateRange.from || new Date(lead.created_at) >= advancedFilters.dateRange.from) &&
        (!advancedFilters.dateRange.to || new Date(lead.created_at) <= advancedFilters.dateRange.to);

      const matchesFollowUp = 
        advancedFilters.hasNextContact === null ||
        (advancedFilters.hasNextContact === true && lead.next_contact !== null) ||
        (advancedFilters.hasNextContact === false && lead.next_contact === null);

      const matchesOverdue = 
        advancedFilters.followUpOverdue === null ||
        (advancedFilters.followUpOverdue === true && lead.next_contact && new Date(lead.next_contact) < new Date());
      
      return matchesSearch && matchesStatus && matchesPriority && matchesSource &&
             matchesAdvancedStatus && matchesAdvancedPriority && matchesAdvancedSource &&
             matchesValueRange && matchesDateRange && matchesFollowUp && matchesOverdue;
    });
  }, [leads, searchQuery, statusFilter, priorityFilter, sourceFilter, advancedFilters]);

  // Análises e métricas
  const analytics = useMemo(() => {
    const total = filteredLeads.length;
    const newLeads = filteredLeads.filter(lead => lead.status === 'new').length;
    const qualifiedLeads = filteredLeads.filter(lead => lead.status === 'qualified').length;
    const wonLeads = filteredLeads.filter(lead => lead.status === 'won').length;
    const lostLeads = filteredLeads.filter(lead => lead.status === 'lost').length;
    
    const totalValue = filteredLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    const wonValue = filteredLeads
      .filter(lead => lead.status === 'won')
      .reduce((sum, lead) => sum + (lead.value || 0), 0);
    
    const conversionRate = total > 0 ? Math.round((wonLeads / total) * 100) : 0;
    const averageValue = total > 0 ? totalValue / total : 0;
    
    // Leads with follow-up needed (next_contact is today or past)
    const today = new Date().toISOString().split('T')[0];
    const followUpNeeded = filteredLeads.filter(lead => 
      lead.next_contact && lead.next_contact <= today && 
      !['won', 'lost'].includes(lead.status)
    ).length;

    const statusStats = {
      new: newLeads,
      contacted: filteredLeads.filter(l => l.status === 'contacted').length,
      qualified: qualifiedLeads,
      proposal: filteredLeads.filter(l => l.status === 'proposal').length,
      negotiation: filteredLeads.filter(l => l.status === 'negotiation').length,
      won: wonLeads,
      lost: lostLeads,
    };

    const priorityStats = {
      high: filteredLeads.filter(l => l.priority === 'high').length,
      medium: filteredLeads.filter(l => l.priority === 'medium').length,
      low: filteredLeads.filter(l => l.priority === 'low').length,
    };

    const sourceStats: { [key: string]: number } = {};
    filteredLeads.forEach(lead => {
      sourceStats[lead.source] = (sourceStats[lead.source] || 0) + 1;
    });

    return {
      total,
      newLeads,
      qualifiedLeads,
      wonLeads,
      lostLeads,
      totalValue,
      wonValue,
      conversionRate,
      averageValue,
      followUpNeeded,
      statusStats,
      priorityStats,
      sourceStats
    };
  }, [filteredLeads]);

  const handleLeadSave = async () => {
    await fetchLeads();
    setShowLeadForm(false);
    setSelectedLead(null);
  };

  const handleLeadEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadForm(true);
    setShowLeadDetails(false);
  };

  const handleLeadView = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetails(true);
  };

  const handleLeadDelete = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      
      // Update local state optimistically
      setLeads(prev => prev.filter(l => l.id !== leadId));
      toast.success('Lead excluído com sucesso');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Erro ao excluir lead');
      // Refresh on error
      fetchLeads();
    }
  };

  const handleLeadMove = (leadId: string, newStatus: string) => {
    // Optimistic update - update local state immediately
    setLeads(prev => prev.map(lead => 
      lead.id === leadId 
        ? { ...lead, status: newStatus as Lead['status'], updated_at: new Date().toISOString() }
        : lead
    ));
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">CRM & Leads</h2>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CRM & Leads</h2>
          <p className="text-muted-foreground">
            Sistema completo para gestão de relacionamento com clientes e leads
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={showLeadForm} onOpenChange={setShowLeadForm}>
            <DialogTrigger asChild>
              <Button variant="action">
                <Plus className="mr-2 h-4 w-4" />
                Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedLead ? 'Editar Lead' : 'Novo Lead'}
                </DialogTitle>
                <DialogDescription>
                  Preencha as informações do lead
                </DialogDescription>
              </DialogHeader>
              <LeadForm 
                lead={selectedLead} 
                onSave={handleLeadSave}
                onCancel={() => {
                  setShowLeadForm(false);
                  setSelectedLead(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Métricas Principais */}
      <CRMMetrics leads={filteredLeads} />

      {/* Intelligent Alerts */}
      {analytics.followUpNeeded > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Atenção Necessária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="p-3 bg-white dark:bg-background rounded-lg border border-orange-200 dark:border-orange-900">
                <div className="text-sm text-muted-foreground mb-1">Follow-ups Atrasados</div>
                <div className="text-2xl font-bold text-orange-600">{analytics.followUpNeeded}</div>
                <p className="text-xs text-muted-foreground mt-1">Requerem ação imediata</p>
              </div>
              
              <div className="p-3 bg-white dark:bg-background rounded-lg border border-orange-200 dark:border-orange-900">
                <div className="text-sm text-muted-foreground mb-1">Alta Prioridade</div>
                <div className="text-2xl font-bold text-red-600">{analytics.priorityStats.high}</div>
                <p className="text-xs text-muted-foreground mt-1">Leads urgentes</p>
              </div>

              <div className="p-3 bg-white dark:bg-background rounded-lg border border-orange-200 dark:border-orange-900">
                <div className="text-sm text-muted-foreground mb-1">Novos Leads</div>
                <div className="text-2xl font-bold text-blue-600">{analytics.newLeads}</div>
                <p className="text-xs text-muted-foreground mt-1">Aguardando contato</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribution Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(analytics.statusStats).map(([status, count]) => {
              const total = analytics.total || 1;
              const percentage = (count / total) * 100;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm capitalize">{status === 'new' ? 'Novo' : status === 'contacted' ? 'Contatado' : status === 'qualified' ? 'Qualificado' : status === 'proposal' ? 'Proposta' : status === 'negotiation' ? 'Negociação' : status === 'won' ? 'Ganho' : 'Perdido'}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5" />
              Distribuição por Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(analytics.priorityStats).map(([priority, count]) => {
              const total = analytics.total || 1;
              const percentage = (count / total) * 100;
              return (
                <div key={priority}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm capitalize">{priority === 'high' ? 'Alta' : priority === 'medium' ? 'Média' : 'Baixa'}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5" />
              Principais Origens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(analytics.sourceStats)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([source, count]) => {
                const total = analytics.total || 1;
                const percentage = (count / total) * 100;
                const isMetaAds = source === 'facebook_leads';
                return (
                  <div key={source}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm capitalize flex items-center gap-1">
                        {isMetaAds && '📱'} {source}
                      </span>
                      <Badge variant={isMetaAds ? "default" : "secondary"} className={isMetaAds ? 'bg-blue-600' : ''}>
                        {count}
                      </Badge>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
          </CardContent>
        </Card>
      </div>

      {/* Alertas do CRM */}
      <CRMAlerts leads={filteredLeads} onEdit={handleLeadEdit} />

      {/* Filtros Avançados */}
      <CRMAdvancedFilters 
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
        onClearFilters={() => setAdvancedFilters({
          status: [],
          priority: [],
          source: [],
          assignedTo: [],
          valueRange: { min: null, max: null },
          dateRange: { from: null, to: null },
          tags: [],
          hasNextContact: null,
          followUpOverdue: null,
        })}
      />

      {/* Filtros e Leads */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Leads</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Análises</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline de Vendas</CardTitle>
              <CardDescription>
                Visão detalhada do funil de vendas e métricas de conversão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{analytics.statusStats.new}</div>
                    <div className="text-sm text-muted-foreground">Novos Leads</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{analytics.statusStats.qualified}</div>
                    <div className="text-sm text-muted-foreground">Qualificados</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{analytics.statusStats.proposal}</div>
                    <div className="text-sm text-muted-foreground">Em Proposta</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{analytics.statusStats.won}</div>
                    <div className="text-sm text-muted-foreground">Fechados</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(analytics.wonValue)}
                  </div>
                  <div className="text-sm text-muted-foreground">Receita Confirmada</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Leads</CardTitle>
                  <CardDescription>
                    Gerencie seus leads em formato kanban ou lista
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={view === 'kanban' ? 'action' : 'outline'}
                    size="sm"
                    onClick={() => setView('kanban')}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={view === 'list' ? 'action' : 'outline'}
                    size="sm"
                    onClick={() => setView('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="new">Novo</SelectItem>
                    <SelectItem value="contacted">Contatado</SelectItem>
                    <SelectItem value="qualified">Qualificado</SelectItem>
                    <SelectItem value="proposal">Proposta</SelectItem>
                    <SelectItem value="negotiation">Negociação</SelectItem>
                    <SelectItem value="won">Ganho</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Prioridades</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Origens</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="social_media">Redes Sociais</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="referral">Indicação</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="advertisement">Anúncio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                {view === 'kanban' ? (
                  <LeadsKanban 
                    leads={filteredLeads} 
                    onEdit={handleLeadEdit}
                    onDelete={handleLeadDelete}
                    onUpdate={fetchLeads}
                    onView={handleLeadView}
                    onLeadMove={handleLeadMove}
                  />
                ) : (
                  <LeadsList 
                    leads={filteredLeads} 
                    onEdit={handleLeadEdit}
                    onDelete={handleLeadDelete}
                    onUpdate={fetchLeads}
                    onView={handleLeadView}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <CRMAnalytics leads={filteredLeads} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <CRMSettings />
        </TabsContent>
      </Tabs>

      {/* Lead Details Dialog */}
      <LeadDetailsDialog
        lead={selectedLead}
        open={showLeadDetails}
        onOpenChange={setShowLeadDetails}
        onEdit={handleLeadEdit}
      />
    </div>
  );
}