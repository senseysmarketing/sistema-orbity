import { useState, useEffect } from "react";
import { Plus, Filter, Search, Grid, List, Webhook, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LeadsKanban } from "@/components/crm/LeadsKanban";
import { LeadsList } from "@/components/crm/LeadsList";
import { LeadForm } from "@/components/crm/LeadForm";
import { WebhooksManager } from "@/components/crm/WebhooksManager";
import { CRMMetrics } from "@/components/crm/CRMMetrics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showWebhooks, setShowWebhooks] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

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

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchQuery === '' || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleLeadSave = () => {
    fetchLeads();
    setShowLeadForm(false);
    setSelectedLead(null);
  };

  const handleLeadEdit = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadForm(true);
  };

  const handleLeadDelete = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      
      setLeads(leads.filter(lead => lead.id !== leadId));
      toast.success('Lead excluído com sucesso');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Erro ao excluir lead');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
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
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">CRM & Leads</h2>
        <div className="flex items-center space-x-2">
          <Dialog open={showWebhooks} onOpenChange={setShowWebhooks}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Webhook className="mr-2 h-4 w-4" />
                Webhooks
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Gerenciar Webhooks</DialogTitle>
                <DialogDescription>
                  Configure webhooks personalizados para integrar com outras ferramentas
                </DialogDescription>
              </DialogHeader>
              <WebhooksManager />
            </DialogContent>
          </Dialog>
          
          <Dialog open={showLeadForm} onOpenChange={setShowLeadForm}>
            <DialogTrigger asChild>
              <Button>
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

      <CRMMetrics leads={leads} />

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
                variant={view === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('kanban')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'list' ? 'default' : 'outline'}
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
          </div>

          {view === 'kanban' ? (
            <LeadsKanban 
              leads={filteredLeads} 
              onEdit={handleLeadEdit}
              onDelete={handleLeadDelete}
              onUpdate={fetchLeads}
            />
          ) : (
            <LeadsList 
              leads={filteredLeads} 
              onEdit={handleLeadEdit}
              onDelete={handleLeadDelete}
              onUpdate={fetchLeads}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}