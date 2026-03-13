import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Users, DollarSign, Target, Calendar, Grid, List, AlertTriangle, TrendingUp, Settings, Download, Filter, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeadsKanban } from "@/components/crm/LeadsKanban";
import { LeadsList } from "@/components/crm/LeadsList";
import { LeadForm } from "@/components/crm/LeadForm";
import { LeadDetailsDialog } from "@/components/crm/LeadDetailsDialog";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { CRMSettings } from "@/components/crm/CRMSettings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { toast } from "sonner";
import { getTemperatureLabel } from "@/lib/leadTemperature";
import { normalizeLeadStatusToDb } from "@/lib/crm/leadStatus";
import { Alert, AlertDescription } from "@/components/ui/alert";

function UnqualifiedLeadsWarning({ leads }: { leads: Lead[] }) {
  // Leads from Facebook that were never scored (null) or had no rules when they arrived (unconfigured)
  const unqualifiedLeads = leads.filter(
    l => l.source === 'facebook_leads' && (!l.qualification_source || l.qualification_source === 'unconfigured')
  );

  if (unqualifiedLeads.length === 0) return null;

  // Group by form name (stored in custom_fields.form_name by Meta) to orient the user
  const formNames = new Map<string, number>();
  for (const lead of unqualifiedLeads) {
    const formName: string = lead.custom_fields?.form_name || lead.custom_fields?.form_id || 'Formulário desconhecido';
    formNames.set(formName, (formNames.get(formName) ?? 0) + 1);
  }

  const unconfigured = unqualifiedLeads.filter(l => l.qualification_source === 'unconfigured').length;
  const notScored = unqualifiedLeads.length - unconfigured;

  return (
    <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800 dark:text-yellow-200 space-y-1">
        <div>
          <strong>{unqualifiedLeads.length} lead{unqualifiedLeads.length > 1 ? 's' : ''}</strong> do Facebook sem qualificação.
          {unconfigured > 0 && <span> {unconfigured} sem regras configuradas.</span>}
          {notScored > 0 && <span> {notScored} aguardando reclassificação.</span>}
          {' '}Vá em <strong>Configurações → Qualificação</strong> e configure ou atualize as regras.
        </div>
        {formNames.size > 0 && (
          <div className="text-xs opacity-80">
            Formulários afetados:{' '}
            {[...formNames.entries()].map(([name, count], i) => (
              <span key={name}>
                {i > 0 && ', '}
                <strong>{name}</strong> ({count})
              </span>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  source: string;
  // Status é string no banco (suporta etapas padrão e personalizadas)
  status: string;
  temperature: 'cold' | 'warm' | 'hot';
  value: number;
  notes: string | null;
  assigned_to: string | null;
  last_contact: string | null;
  next_contact: string | null;
  tags: string[] | null;
  custom_fields: any;
  qualification_source?: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export default function CRM() {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const { refresh: refreshStatuses, mapDatabaseStatusToDisplay, getStatusConfig } = useLeadStatuses();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null });
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showLeadDetails, setShowLeadDetails] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Hidden columns state with localStorage persistence
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    if (!currentAgency?.id) return new Set();
    try {
      const saved = localStorage.getItem(`crm_hidden_columns_${currentAgency.id}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  
  // Persist hidden columns to localStorage when they change
  useEffect(() => {
    if (currentAgency?.id) {
      localStorage.setItem(
        `crm_hidden_columns_${currentAgency.id}`,
        JSON.stringify([...hiddenColumns])
      );
    }
  }, [hiddenColumns, currentAgency?.id]);
  
  // Load hidden columns when agency changes
  useEffect(() => {
    if (currentAgency?.id) {
      try {
        const saved = localStorage.getItem(`crm_hidden_columns_${currentAgency.id}`);
        setHiddenColumns(saved ? new Set(JSON.parse(saved)) : new Set());
      } catch {
        setHiddenColumns(new Set());
      }
    }
  }, [currentAgency?.id]);
  
  const handleToggleColumn = (columnId: string) => {
    setHiddenColumns(prev => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };
  
  const handleShowAllColumns = () => {
    setHiddenColumns(new Set());
  };

  // Get unique sources from existing leads
  const uniqueSources = useMemo(() => {
    const sources = new Set(leads.map(lead => lead.source).filter(Boolean));
    return Array.from(sources);
  }, [leads]);

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

  // Realtime: mantém Pipeline + Dashboard sincronizados instantaneamente (INSERT/UPDATE/DELETE)
  useEffect(() => {
    if (!currentAgency?.id) return;

    const channel = supabase
      .channel(`crm-leads-${currentAgency.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `agency_id=eq.${currentAgency.id}`,
        },
        (payload: any) => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          if (eventType === 'INSERT') {
            const next = payload.new as Lead;
            if (!next?.id) return;
            setLeads((prev) => {
              if (prev.some((l) => l.id === next.id)) return prev;
              return [next, ...prev];
            });
          }

          if (eventType === 'UPDATE') {
            const next = payload.new as Lead;
            if (!next?.id) return;
            setLeads((prev) => prev.map((l) => (l.id === next.id ? next : l)));
          }

          if (eventType === 'DELETE') {
            const oldRow = payload.old as Partial<Lead>;
            if (!oldRow?.id) return;
            setLeads((prev) => prev.filter((l) => l.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentAgency?.id]);

  const filteredLeads = useMemo(() => {
    const statusConfig = getStatusConfig();
    const filterDbStatus =
      statusFilter === 'all'
        ? 'all'
        : (() => {
            const cfg = statusConfig[statusFilter as keyof typeof statusConfig];
            // statusFilter é um statusKey (ex: "vendas"). Convertemos via título + normalização.
            return normalizeLeadStatusToDb(cfg?.title || statusFilter);
          })();

    return leads.filter(lead => {
      const matchesSearch = searchQuery === '' || 
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const leadDbStatus = normalizeLeadStatusToDb(lead.status);
      const matchesStatus = filterDbStatus === 'all' || leadDbStatus === filterDbStatus;
      const matchesTemperature = priorityFilter === 'all' || lead.temperature === priorityFilter;
      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;

      // Date filter
      const matchesDateRange = 
        (!dateFilter.from || new Date(lead.created_at) >= dateFilter.from) &&
        (!dateFilter.to || new Date(lead.created_at) <= dateFilter.to);
      
      return matchesSearch && matchesStatus && matchesTemperature && matchesSource && matchesDateRange;
    });
  }, [leads, searchQuery, statusFilter, priorityFilter, sourceFilter, dateFilter, getStatusConfig]);

  const handleLeadSave = async (savedLead: Lead) => {
    setLeads(prev => {
      const exists = prev.find(l => l.id === savedLead.id);
      if (exists) {
        return prev.map(l => l.id === savedLead.id ? savedLead : l);
      } else {
        return [savedLead, ...prev];
      }
    });
    
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
      
      setLeads(prev => prev.filter(l => l.id !== leadId));
      toast.success('Lead excluído com sucesso');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Erro ao excluir lead');
      fetchLeads();
    }
  };

  const handleLeadMove = (leadId: string, newStatus: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId 
        ? { ...lead, status: newStatus, updated_at: new Date().toISOString() }
        : lead
    ));
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Empresa', 'Status', 'Temperatura', 'Origem', 'Valor', 'Criado em'];
    const csvData = filteredLeads.map(lead => [
      lead.name,
      lead.email || '',
      lead.phone || '',
      lead.company || '',
      mapDatabaseStatusToDisplay(lead.status),
      getTemperatureLabel(lead.temperature),
      lead.source,
      lead.value.toString(),
      new Date(lead.created_at).toLocaleDateString('pt-BR')
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${filteredLeads.length} leads exportados com sucesso`);
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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">CRM & Leads</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Gestão comercial com funil de vendas e métricas de investimento
          </p>
        </div>
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

      {/* Main Tabs - 3 tabs: Dashboard, Pipeline, Settings */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard" className="flex-shrink-0 gap-1 md:gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="flex-shrink-0 gap-1 md:gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Pipeline</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-shrink-0 gap-1 md:gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <CRMDashboard leads={leads} />
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <UnqualifiedLeadsWarning leads={leads} />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pipeline de Leads</CardTitle>
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
              <div className="space-y-4">
                {/* Search and Filters */}
                <div className="space-y-3">
                  {/* Search Row */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Buscar leads..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {/* Filters Row with Horizontal Scroll */}
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                    <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[130px] sm:w-[160px] h-9 text-xs sm:text-sm flex-shrink-0">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os Status</SelectItem>
                        {Object.entries(getStatusConfig()).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="w-[110px] sm:w-[140px] h-9 text-xs sm:text-sm flex-shrink-0">
                        <SelectValue placeholder="Temp." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="hot">🔥 Quente</SelectItem>
                        <SelectItem value="warm">🌡️ Morno</SelectItem>
                        <SelectItem value="cold">❄️ Frio</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sourceFilter} onValueChange={setSourceFilter}>
                      <SelectTrigger className="w-[110px] sm:w-[140px] h-9 text-xs sm:text-sm flex-shrink-0">
                        <SelectValue placeholder="Origem" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {uniqueSources.map(source => (
                          <SelectItem key={source} value={source}>
                            {source === 'facebook_leads' ? 'Meta Ads' : source}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {(statusFilter !== 'all' || priorityFilter !== 'all' || sourceFilter !== 'all' || searchQuery) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatusFilter('all');
                        setPriorityFilter('all');
                        setSourceFilter('all');
                        setSearchQuery('');
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  )}
                  <div className="flex-1" />
                  <span className="text-sm text-muted-foreground">
                    {filteredLeads.length} leads
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToCSV}
                    disabled={filteredLeads.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>

              <div className="mt-6">
                {view === 'kanban' ? (
                  <LeadsKanban 
                    leads={filteredLeads} 
                    onEdit={handleLeadEdit}
                    onDelete={handleLeadDelete}
                    onUpdate={fetchLeads}
                    onView={handleLeadView}
                    onLeadMove={handleLeadMove}
                    hiddenColumns={hiddenColumns}
                    onToggleColumn={handleToggleColumn}
                    onShowAllColumns={handleShowAllColumns}
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

        {/* Settings Tab */}
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
