import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Mail, Phone, Building, Calendar, DollarSign, Clock, 
  Edit, Tag, Target, MessageSquare, History, ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_TEMPERATURES, LeadTemperature } from "@/lib/leadTemperature";
import { WhatsAppChat } from "./WhatsAppChat";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  source: string;
  status: string;
  temperature: string;
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

// Campos padrão do Facebook que não são perguntas do formulário
const STANDARD_FIELDS = ['full_name', 'email', 'phone_number', 'company_name', 'form_name', 'page_name', 'ad_id', 'adset_id', 'campaign_id', 'form_id', 'page_id', 'platform', 'leadgen_id'];

// Formatar pergunta: "qual_o_seu_vgv_mensal?" → "Qual o seu VGV mensal?"
const formatQuestion = (key: string) => {
  return key
    .replace(/_/g, ' ')
    .replace(/\?$/, '')
    .replace(/^\w/, c => c.toUpperCase()) + '?';
};

// Formatar resposta: "menos_de_r$500.000" → "Menos de R$ 500.000"
const formatAnswer = (value: string | null | undefined) => {
  if (!value) return '-';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/r\$/gi, 'R$ ')
    .replace(/^\w/, c => c.toUpperCase());
};

// Extrair apenas as perguntas personalizadas
const getFormQuestions = (customFields: any) => {
  if (!customFields || typeof customFields !== 'object') return [];
  
  return Object.entries(customFields)
    .filter(([key]) => !STANDARD_FIELDS.includes(key.toLowerCase()))
    .map(([question, answer]) => ({
      question: formatQuestion(question),
      answer: formatAnswer(answer as string)
    }));
};

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

  const formatShortDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'leads': 'bg-blue-500',
      'em_contato': 'bg-sky-500',
      'qualified': 'bg-orange-500',
      'scheduled': 'bg-yellow-500',
      'meeting': 'bg-purple-500',
      'proposal': 'bg-pink-500',
      'won': 'bg-green-500',
      'lost': 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getTemperatureColor = (temperature: string) => {
    const temp = LEAD_TEMPERATURES[temperature as LeadTemperature];
    return temp?.bgLight || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'leads': 'Novo Lead',
      'em_contato': 'Em contato',
      'qualified': 'Qualificado',
      'scheduled': 'Agendamento',
      'meeting': 'Reunião',
      'proposal': 'Proposta',
      'won': 'Ganho',
      'lost': 'Perdido',
    };
    return labels[status] || status;
  };

  const getTemperatureLabel = (temperature: string) => {
    const temp = LEAD_TEMPERATURES[temperature as LeadTemperature];
    return temp ? `${temp.emoji} ${temp.label}` : temperature;
  };

  const isMetaAdsLead = lead.source === 'facebook_leads';
  const formQuestions = getFormQuestions(lead.custom_fields);
  const daysInFunnel = Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <DialogTitle className="text-xl truncate">{lead.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap text-xs">
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
            <div className="flex gap-2 flex-wrap justify-end flex-shrink-0">
              <Badge className={getStatusColor(lead.status)}>
                {getStatusLabel(lead.status)}
              </Badge>
              <Badge variant="outline" className={getTemperatureColor(lead.temperature)}>
                {getTemperatureLabel(lead.temperature)}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="flex-shrink-0 w-full justify-start">
            <TabsTrigger value="details" className="text-xs">Detalhes</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs gap-1">
              <MessageSquare className="h-3 w-3" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 overflow-y-auto space-y-4 py-4 min-h-0 mt-0">
          {/* Metrics Cards */}
          <div className="grid gap-4 grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 font-medium">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  Valor do Lead
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(lead.value)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Tempo no Funil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-600">
                  {daysInFunnel} {daysInFunnel === 1 ? 'dia' : 'dias'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4" />
                Informações de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {lead.email && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium truncate">{lead.email}</p>
                  </div>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-medium">{lead.phone}</p>
                  </div>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10">
                    <Building className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Empresa</p>
                    <p className="text-sm font-medium">{lead.company}</p>
                  </div>
                </div>
              )}
              {!lead.email && !lead.phone && !lead.company && (
                <p className="text-sm text-muted-foreground italic">Nenhuma informação de contato</p>
              )}
            </CardContent>
          </Card>

          {/* Meta Ads Form Questions */}
          {isMetaAdsLead && formQuestions.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 font-medium">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  Respostas do Formulário
                  <Badge variant="secondary" className="ml-auto text-xs">Meta Ads</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {formQuestions.map((item, index) => (
                  <div key={index} className="border-b border-blue-200 dark:border-blue-800 last:border-0 pb-3 last:pb-0">
                    <p className="text-xs text-muted-foreground">{item.question}</p>
                    <p className="text-sm font-medium mt-0.5">{item.answer}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Meta Ads Source Info (when no form questions) */}
          {isMetaAdsLead && formQuestions.length === 0 && (
            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 font-medium">
                  <Target className="h-4 w-4 text-blue-600" />
                  Dados do Meta Ads
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge className="bg-blue-600 text-white">📱 Lead de Anúncio</Badge>
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

          {/* Dates and Follow-ups */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 font-medium">
                <Calendar className="h-4 w-4" />
                Datas e Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Criado em</span>
                <span className="text-sm font-medium">{formatShortDate(lead.created_at)}</span>
              </div>
              {lead.last_contact && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Último contato</span>
                  <span className="text-sm font-medium">{formatShortDate(lead.last_contact)}</span>
                </div>
              )}
              {lead.next_contact && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Próximo contato</span>
                  <Badge variant={new Date(lead.next_contact) < new Date() ? "destructive" : "secondary"} className="text-xs">
                    {formatShortDate(lead.next_contact)}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 font-medium">
                  <Tag className="h-4 w-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {lead.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Accordions for Notes and History */}
          <Accordion type="multiple" className="space-y-2">
            {/* Notes */}
            <AccordionItem value="notes" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4" />
                  Notas do Lead
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {lead.notes ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhuma nota adicionada</p>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* History */}
            <AccordionItem value="history" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <History className="h-4 w-4" />
                  Histórico de Movimentações
                  {history.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">{history.length}</Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {loadingHistory ? (
                  <p className="text-sm text-muted-foreground">Carregando histórico...</p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhuma movimentação registrada</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((item) => (
                      <div key={item.id} className="flex gap-3 pb-3 border-b last:border-0 last:pb-0">
                        <div className="flex-1">
                          <p className="text-sm">{item.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} 
                            {item.profiles && ` • por ${item.profiles.name}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          </TabsContent>

          <TabsContent value="whatsapp" className="flex-1 overflow-hidden min-h-0 mt-0">
            <WhatsAppChat
              leadId={lead.id}
              leadPhone={lead.phone}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
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
