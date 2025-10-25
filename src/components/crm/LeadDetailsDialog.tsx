import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, Phone, Building, Calendar, DollarSign, Target, Clock, 
  Edit, Tag, User, Globe, MessageSquare, TrendingUp, History
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  source: string;
  status: string;
  priority: string;
  value: number;
  notes: string | null;
  assigned_to: string | null;
  last_contact: string | null;
  next_contact: string | null;
  tags: string[] | null;
  custom_fields: any;
  created_at: string;
  updated_at: string;
}

interface LeadHistoryItem {
  id: string;
  action_type: string;
  description: string;
  created_at: string;
  profiles: {
    name: string;
  } | null;
}

interface LeadDetailsDialogProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (lead: Lead) => void;
}

export function LeadDetailsDialog({ lead, open, onOpenChange, onEdit }: LeadDetailsDialogProps) {
  const [history, setHistory] = useState<LeadHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (lead && open) {
      fetchHistory();
    }
  }, [lead, open]);

  const fetchHistory = async () => {
    if (!lead) return;
    
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('lead_history')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch user names separately
      const historyWithUsers = await Promise.all(
        (data || []).map(async (item) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('user_id', item.user_id)
            .single();
          
          return {
            ...item,
            profiles: profile
          };
        })
      );
      
      setHistory(historyWithUsers as LeadHistoryItem[]);
    } catch (error) {
      console.error('Error fetching lead history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };
  if (!lead) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'new': 'bg-blue-500',
      'contacted': 'bg-yellow-500',
      'qualified': 'bg-orange-500',
      'proposal': 'bg-purple-500',
      'negotiation': 'bg-indigo-500',
      'won': 'bg-green-500',
      'lost': 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'high': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'low': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'new': 'Novo',
      'contacted': 'Contatado',
      'qualified': 'Qualificado',
      'proposal': 'Proposta',
      'negotiation': 'Negociação',
      'won': 'Ganho',
      'lost': 'Perdido',
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      'high': 'Alta',
      'medium': 'Média',
      'low': 'Baixa',
    };
    return labels[priority] || priority;
  };

  const isMetaAdsLead = lead.source === 'facebook_leads';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl">{lead.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                {lead.company && (
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {lead.company}
                  </span>
                )}
                {lead.position && <span>• {lead.position}</span>}
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {lead.source}
                </span>
              </DialogDescription>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Badge className={getStatusColor(lead.status)}>
                {getStatusLabel(lead.status)}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(lead.priority)}>
                {getPriorityLabel(lead.priority)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[calc(90vh-280px)]">
            <TabsContent value="overview" className="space-y-4">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Informações de Contato
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {lead.email && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm font-medium">{lead.email}</p>
                      </div>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="text-sm font-medium">{lead.phone}</p>
                      </div>
                    </div>
                  )}
                  {lead.company && (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <Building className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Empresa</p>
                        <p className="text-sm font-medium">{lead.company}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lead Value & Timeline */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Valor do Lead
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(lead.value)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Valor estimado da oportunidade
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Tempo no Funil
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))} dias
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Desde {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Important Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Datas e Follow-ups
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Criado em</span>
                    <span className="text-sm font-medium">{formatDate(lead.created_at)}</span>
                  </div>
                  {lead.last_contact && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Último contato</span>
                      <span className="text-sm font-medium">{formatDate(lead.last_contact)}</span>
                    </div>
                  )}
                  {lead.next_contact && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Próximo contato</span>
                      <Badge variant={new Date(lead.next_contact) < new Date() ? "destructive" : "secondary"}>
                        {formatDate(lead.next_contact)}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Meta Ads Data */}
              {isMetaAdsLead && (
                <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Dados do Meta Ads
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 text-white">📱 Lead de Anúncio</Badge>
                    </div>
                    {lead.custom_fields?.form_name && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Formulário:</span>{' '}
                        <span className="font-medium">{lead.custom_fields.form_name}</span>
                      </p>
                    )}
                    {lead.custom_fields?.page_name && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Página:</span>{' '}
                        <span className="font-medium">{lead.custom_fields.page_name}</span>
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informações Adicionais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <Badge className={getStatusColor(lead.status)}>
                        {getStatusLabel(lead.status)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Prioridade</p>
                      <Badge className={getPriorityColor(lead.priority)}>
                        {getPriorityLabel(lead.priority)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Origem</p>
                      <Badge variant="secondary">{lead.source}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Última atualização</p>
                      <p className="text-sm">{format(new Date(lead.updated_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                  </div>

                  {lead.tags && lead.tags.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Notas do Lead
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {lead.notes ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma nota adicionada</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Movimentações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingHistory ? (
                    <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                  ) : history.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhuma movimentação registrada</p>
                  ) : (
                    <div className="space-y-4">
                      {history.map((item) => (
                        <div key={item.id} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} 
                              {item.profiles && ` • por ${item.profiles.name}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => {
            onEdit(lead);
            onOpenChange(false);
          }}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
