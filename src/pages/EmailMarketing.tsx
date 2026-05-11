import { useState, useEffect } from "react";
import { Mail, Send, Plus, ExternalLink, Loader2, Wallet, Calendar, Users, RefreshCw, AlertCircle, TrendingUp, BarChart3, Trash2, Search, Sparkles, Eye, Code } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAIAssist } from "@/hooks/useAIAssist";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ImportSendpulseDialog } from "@/components/email/ImportSendpulseDialog";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CampaignStatsDialog } from "@/components/email-marketing/CampaignStatsDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ContactLists } from "@/components/email-marketing/ContactLists";
import { AddSenderDialog } from "@/components/email-marketing/AddSenderDialog";
import { TestEmailDialog } from "@/components/email-marketing/TestEmailDialog";
import { CampaignBuilder } from "@/components/email-marketing/CampaignBuilder";


export default function EmailMarketing() {
  const { currentAgency } = useAgency();
  const { loading: aiLoading, callAI } = useAIAssist() as any;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("lists");
  const [configured, setConfigured] = useState(false);
  const [addressBooks, setAddressBooks] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [targetBookId, setTargetBookId] = useState<string>("");
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [selectedBookContacts, setSelectedBookContacts] = useState<number | null>(null);
  const [scheduled, setScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [senders, setSenders] = useState<any[]>([]);
  const [loadingSenders, setLoadingSenders] = useState(false);
  const [addSenderOpen, setAddSenderOpen] = useState(false);
  const [testEmailOpen, setTestEmailOpen] = useState(false);

  
  const [campaign, setCampaign] = useState({
    sender_name: "",
    sender_email: "",
    subject: "",
    body: "",
    book_id: ""
  });
  const [sending, setSending] = useState(false);
  const [campaignView, setCampaignView] = useState<"editor" | "preview">("editor");

  useEffect(() => {
    checkIntegration();
  }, [currentAgency?.id]);

  async function checkIntegration() {
    if (!currentAgency?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('agency_integrations')
        .select('sendpulse_client_id, sendpulse_client_secret')
        .eq('agency_id', currentAgency.id)
        .single();
      if (data?.sendpulse_client_id && data?.sendpulse_client_secret) {
        setConfigured(true);
        fetchAddressBooks();
        fetchCampaigns();
        fetchSenders();
      } else {
        setConfigured(false);
      }
      if (data?.sendpulse_client_id) {
        fetchAccountInfo();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAddressBooks() {
    try {
      const { data, error } = await supabase.functions.invoke('sendpulse-api', {
        body: { action: 'get_addressbooks' }
      });
      if (error) throw error;
      console.log("AddressBooks fetched:", data);
      setAddressBooks(data || []);
      // If we have lists, refresh account info to get latest contact totals
      if (data && data.length > 0) {
        fetchAccountInfo();
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar listas de contatos");
    }
  }

  async function fetchCampaigns() {
    setLoadingCampaigns(true);
    try {
      const { data, error } = await supabase.functions.invoke('sendpulse-api', {
        body: { action: 'get_campaigns' }
      });
      if (error) throw error;
      setCampaigns(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoadingCampaigns(false);
    }
  }

  async function fetchSenders() {
    setLoadingSenders(true);
    try {
      const { data, error } = await supabase.functions.invoke('sendpulse-api', {
        body: { action: 'get_senders' }
      });
      if (error) throw error;
      setSenders(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar remetentes");
    } finally {
      setLoadingSenders(false);
    }
  }

  async function handleCancelCampaign(campaignId: number) {
    if (!confirm("Tem certeza que deseja cancelar/remover esta campanha?")) return;
    
    try {
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: { action: 'cancel_campaign', campaign_id: campaignId }
      });
      if (error) throw error;
      toast.success("Operação realizada com sucesso!");
      fetchCampaigns();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao cancelar campanha");
    }
  }

  async function fetchAccountInfo() {
    setLoadingInfo(true);
    try {
      const { data, error } = await supabase.functions.invoke('sendpulse-api', {
        body: { action: 'get_account_info' }
      });
      if (error) throw error;
      setAccountInfo(data);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar informações da conta");
    } finally {
      setLoadingInfo(false);
    }
  }

  const getEmailUsage = () => {
    if (!accountInfo) return { sent: 0, limit: 0, percent: 0 };
    const sent = accountInfo.email_qty || 0;
    const limit = accountInfo.email_limit || 15000;
    const percent = limit > 0 ? (sent / limit) * 100 : 0;
    return { sent, limit, percent };
  };

  const getContactUsage = () => {
    if (!accountInfo) return { total: 0, limit: 0, percent: 0 };
    
    // Sum contacts from all address books for a more accurate total
    const addressBookTotal = addressBooks.reduce((acc, book) => acc + (book.all_email_qty || book.all_email_count || 0), 0);
    const total = addressBookTotal > 0 ? addressBookTotal : (accountInfo.emails_total || 0);
    
    const limit = accountInfo.addressbook_limit || 500;
    const percent = limit > 0 ? (total / limit) * 100 : 0;
    return { total, limit, percent };
  };

  async function handleBookSelect(val: string) {
    setCampaign(prev => ({ ...prev, book_id: val }));
    const book = addressBooks.find(b => b.id.toString() === val);
    if (book) setSelectedBookContacts(book.all_email_qty || book.all_email_count || 0);
  }

  async function handleSenderSelect(val: string) {
    const sender = senders.find(s => s.email === val);
    if (sender) {
      setCampaign(prev => ({ 
        ...prev, 
        sender_email: sender.email, 
        sender_name: sender.name 
      }));
    }
  }

  // Note: List synchronization and creation are now handled in the ContactLists component.

  async function handleSendCampaign() {
    const { sender_name, sender_email, subject, body, book_id } = campaign;
    if (!sender_name || !sender_email || !subject || !body || !book_id) {
      toast.error("Preencha todos os campos da campanha");
      return;
    }
    setSending(true);
    let send_date = undefined;
    if (scheduled && scheduledDate) {
      const dateStr = format(scheduledDate, 'yyyy-MM-dd');
      send_date = `${dateStr} ${scheduledTime}:00`;
    }
    try {
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: { 
          action: 'create_campaign',
          ...campaign,
          book_id: parseInt(book_id),
          send_date
        }
      });
      if (error) throw error;
      toast.success(scheduled ? "Campanha agendada com sucesso!" : "Campanha enviada com sucesso!");
      setCampaign({ sender_name: "", sender_email: "", subject: "", body: "", book_id: "" });
      fetchCampaigns();
      setActiveTab("campaigns");
    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message || "";
      if (errorMessage.includes("QUOTA_EXCEEDED")) {
        toast.error("Saldo insuficiente", {
          description: "O seu saldo na SendPulse é insuficiente para esta campanha. Por favor, regularize seu plano no painel da SendPulse."
        });
      } else if (errorMessage.includes("PLAN_RESTRICTION")) {
        toast.error("Restrição de Plano", {
          description: "Seu plano SendPulse possui restrições para esta operação. Verifique sua conta."
        });
      } else {
        toast.error("Erro ao processar campanha");
      }
    } finally {
      setSending(false);
    }
  }

  async function handleAIGenerate() {
    if (!aiPrompt) return;
    try {
      const result = await callAI("email_generation", aiPrompt, currentAgency?.id);
      const html = typeof result === "string" ? result : result?.html;
      if (html) {
        setCampaign(prev => ({ ...prev, body: html }));
        setAiPromptOpen(false);
        setAiPrompt("");
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] space-y-6 text-center max-w-lg mx-auto">
        <div className="p-6 rounded-full bg-secondary/50">
          <Mail className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">E-mail Marketing (SendPulse)</h2>
          <p className="text-muted-foreground">
            Sua conta SendPulse ainda não foi conectada. Configure as credenciais para começar a criar campanhas.
          </p>
        </div>
        <Button asChild variant="action" size="lg">
          <Link to="/dashboard/settings?tab=integrations">Configurar SendPulse</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">E-mail Marketing</h2>
          <p className="text-muted-foreground">Gestão profissional de campanhas e listas com inteligência artificial.</p>
        </div>

        {configured && accountInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Plano */}
            <Card className="bg-card/20 border shadow-none">
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Seu Plano</span>
                  <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-bold">
                    {accountInfo.pricing_plan}
                  </Badge>
                </div>
                <div className="flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">SendPulse Connected</span>
                    {accountInfo.renewal_date && (
                      <span className="text-[10px] text-muted-foreground italic">Renova em: {accountInfo.renewal_date}</span>
                    )}
                  </div>
                  <TrendingUp className="h-4 w-4 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: E-mails */}
            <Card className="bg-card/20 border shadow-none">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Volume Mensal (E-mails)</span>
                  <span className="text-xs font-bold">{getEmailUsage().sent.toLocaleString()} / {getEmailUsage().limit.toLocaleString()}</span>
                </div>
                <Progress value={getEmailUsage().percent} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground">Uso de quota atual no mês</p>
              </CardContent>
            </Card>

            {/* Card 3: Base */}
            <Card className="bg-card/20 border shadow-none">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Base de Contatos</span>
                  <span className="text-xs font-bold">{getContactUsage().total.toLocaleString()} / {getContactUsage().limit.toLocaleString()}</span>
                </div>
                <Progress value={getContactUsage().percent} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground">Capacidade total de contatos únicos</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(val) => {
        setActiveTab(val);
        setAiPrompt("");
      }} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lists" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Listas de Contatos</span>
          </TabsTrigger>
          <TabsTrigger value="campaign" className="gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Campanha</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Gerenciar Campanhas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="space-y-4">
          <ContactLists addressBooks={addressBooks} onRefresh={fetchAddressBooks} />
        </TabsContent>

        <TabsContent value="campaign" className="pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
            {/* Coluna Esquerda: O Estúdio (70%) */}
            <div className="lg:col-span-7">
              <Card className="border shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b space-y-0">
                  <div className="flex items-center gap-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" /> Estúdio de Criação
                    </CardTitle>
                    <Separator orientation="vertical" className="h-6" />
                    <ToggleGroup 
                      type="single" 
                      value={campaignView} 
                      onValueChange={(val) => val && setCampaignView(val as any)}
                      size="sm"
                      className="bg-muted/50 p-1 rounded-lg"
                    >
                      <ToggleGroupItem value="editor" aria-label="Editor mode" className="gap-2">
                        <Code className="h-4 w-4" />
                        <span className="hidden sm:inline">Editor</span>
                      </ToggleGroupItem>
                      <ToggleGroupItem value="preview" aria-label="Preview mode" className="gap-2">
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Visualização</span>
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <Dialog open={aiPromptOpen} onOpenChange={(open) => {
                    setAiPromptOpen(open);
                    if (!open) setAiPrompt("");
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Sparkles className="h-4 w-4" /> Escrever com IA
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>O que você quer escrever?</DialogTitle>
                        <DialogDescription>
                          Descreva o objetivo do e-mail e nossa IA criará o conteúdo para você.
                          <br />
                          <span className="text-[10px] text-primary font-medium">
                            Dica: Você pode pedir para a IA usar as variáveis {"{{Nome}}"} e {"{{Telefone}}"} no texto.
                          </span>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Textarea placeholder="Ex: Oferta de serviço de gestão de tráfego para novos leads..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} rows={4} />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAiPromptOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAIGenerate} disabled={aiLoading || !aiPrompt}>
                          {aiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gerar Conteúdo
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <div className="flex-1 p-0 overflow-y-auto bg-card/5">
                  {campaignView === "editor" ? (
                    <div className="p-4">
                      <RichTextEditor 
                        value={campaign.body}
                        onChange={(val) => setCampaign(prev => ({ ...prev, body: val }))}
                        placeholder="Escreva o conteúdo persuasivo da sua campanha..."
                      />
                    </div>
                  ) : (
                    <div className="p-8 bg-muted/20 min-h-full flex justify-center">
                      <div className="w-full max-w-[600px] bg-white shadow-lg border rounded-lg p-10 min-h-[500px]">
                        <div 
                          className="prose prose-slate max-w-none text-gray-900"
                          dangerouslySetInnerHTML={{ __html: campaign.body || '<p className="text-gray-400 italic">Nenhum conteúdo para visualizar...</p>' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Coluna Direita: Logística de Voo (30%) */}
            <div className="lg:col-span-3 space-y-6">
              <Card className="border shadow-sm">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" /> Logística de Voo
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Seção 1: Informações Básicas */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground">Informações Básicas</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="sender_select">Remetente da Campanha</Label>
                        <div className="flex flex-col gap-2">
                          <Select onValueChange={handleSenderSelect} value={campaign.sender_email}>
                            <SelectTrigger id="sender_select">
                              <SelectValue placeholder={loadingSenders ? "Carregando remetentes..." : "Selecione um remetente verificado..."} />
                            </SelectTrigger>
                            <SelectContent>
                              {senders.filter(s => s.status === 'Active' || s.is_activated).map(sender => (
                                <SelectItem key={sender.email} value={sender.email}>
                                  {sender.name} &lt;{sender.email}&gt;
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 justify-start text-[10px]"
                            onClick={() => setAddSenderOpen(true)}
                          >
                            <Plus className="h-3 w-3 mr-1" /> Adicionar novo remetente
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Assunto</Label>
                        <Input 
                          id="subject"
                          placeholder="Assunto cativante..." 
                          value={campaign.subject} 
                          onChange={e => setCampaign(prev => ({ ...prev, subject: e.target.value }))} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Lista de Destino</Label>
                        <Select onValueChange={handleBookSelect} value={campaign.book_id}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            {addressBooks.map(book => (
                              <SelectItem key={book.id} value={book.id.toString()}>{book.name} ({book.all_email_count})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {selectedBookContacts !== null && accountInfo && selectedBookContacts > 500 && (
                          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                            <p className="text-[10px] leading-tight text-amber-800">
                              ⚠️ Esta lista ({selectedBookContacts}) excede o limite do seu plano (500 contatos).
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Seção 2: Agendamento */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-muted-foreground">Agendamento</h4>
                      <Switch checked={scheduled} onCheckedChange={setScheduled} />
                    </div>
                    
                    {scheduled && (
                      <div className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                          <Label>Data do Disparo</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !scheduledDate && "text-muted-foreground")}>
                                <Calendar className="mr-2 h-4 w-4 opacity-50" />
                                {scheduledDate ? format(scheduledDate, "PPP") : <span>Selecione...</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <CalendarComponent mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus disabled={(date) => date < new Date()} />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>Horário</Label>
                          <Select value={scheduledTime} onValueChange={setScheduledTime}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }).map((_, i) => (
                                <SelectItem key={`${i}:00`} value={`${String(i).padStart(2, '0')}:00`}>{String(i).padStart(2, '0')}:00</SelectItem>
                              ))}
                              {Array.from({ length: 24 }).map((_, i) => (
                                <SelectItem key={`${i}:30`} value={`${String(i).padStart(2, '0')}:30`}>{String(i).padStart(2, '0')}:30</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <Button 
                      variant="action" 
                      size="lg" 
                      className="w-full gap-2 h-11 text-sm font-semibold" 
                      onClick={handleSendCampaign} 
                      disabled={sending || !campaign.sender_email || !campaign.book_id || !campaign.subject || !campaign.body}
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : (scheduled ? <Calendar className="h-4 w-4" /> : <Send className="h-4 w-4" />)}
                      {scheduled ? "Agendar Campanha" : "Disparar Campanha Agora"}
                    </Button>

                    <Button 
                      variant="outline" 
                      className="w-full mt-2 gap-2"
                      onClick={() => setTestEmailOpen(true)}
                      disabled={!campaign.sender_email || !campaign.subject || !campaign.body}
                    >
                      🧪 Enviar E-mail de Teste
                    </Button>
                  </div>

                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-lg font-medium">Relatório de Campanhas</h3>
            <Button variant="outline" className="gap-2" onClick={fetchCampaigns} disabled={loadingCampaigns}>
              <RefreshCw className={cn("h-4 w-4", loadingCampaigns && "animate-spin")} /> Atualizar
            </Button>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Campanha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lista de Destino</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCampaigns ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : campaigns.length > 0 ? campaigns.map((camp) => (
                  <TableRow key={camp.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{camp.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{camp.subject}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {camp.status === 0 && <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Agendada</Badge>}
                      {camp.status === 1 && <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Enviando</Badge>}
                      {camp.status === 2 && <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">Concluída</Badge>}
                      {camp.status === 3 && <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">Erro</Badge>}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{addressBooks.find(b => b.id === camp.list_id)?.name || camp.list_id}</TableCell>
                    <TableCell className="text-sm">{new Date(camp.send_date || camp.all_email_count).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setSelectedCampaign(camp);
                          setStatsDialogOpen(true);
                        }}
                      >
                        <BarChart3 className="h-4 w-4 text-primary" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:text-red-600"
                        onClick={() => handleCancelCampaign(camp.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma campanha encontrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <CampaignStatsDialog 
        open={statsDialogOpen} 
        onOpenChange={setStatsDialogOpen} 
        campaign={selectedCampaign} 
      />

      <AddSenderDialog 
        open={addSenderOpen}
        onOpenChange={setAddSenderOpen}
        onSuccess={fetchSenders}
      />

      <TestEmailDialog 
        open={testEmailOpen}
        onOpenChange={setTestEmailOpen}
        campaign={{
          sender_name: campaign.sender_name,
          sender_email: campaign.sender_email,
          subject: campaign.subject,
          body: campaign.body
        }}
      />
    </div>
  );
}
