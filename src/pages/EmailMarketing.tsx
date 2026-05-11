import { useState, useEffect } from "react";
import { Mail, Send, Plus, ExternalLink, Loader2, Wallet, Calendar, Users, RefreshCw, AlertCircle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgency } from "@/hooks/useAgency";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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

export default function EmailMarketing() {
  const { currentAgency } = useAgency();
  const { loading: aiLoading, callAI } = useAIAssist() as any;
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [addressBooks, setAddressBooks] = useState<any[]>([]);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [selectedBookContacts, setSelectedBookContacts] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [scheduledTime, setScheduledTime] = useState("09:00");
  
  const [campaign, setCampaign] = useState({
    sender_name: "",
    sender_email: "",
    subject: "",
    body: "",
    book_id: ""
  });
  const [sending, setSending] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

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
      setAddressBooks(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar listas de contatos");
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
    const limit = accountInfo.email_limit || 0;
    const percent = limit > 0 ? (sent / limit) * 100 : 0;
    return { sent, limit, percent };
  };

  const getContactUsage = () => {
    if (!accountInfo) return { total: 0, limit: 0, percent: 0 };
    const total = addressBooks.reduce((acc, book) => acc + (book.all_email_count || 0), 0);
    const limit = accountInfo.addressbook_limit || 0;
    const percent = limit > 0 ? (total / limit) * 100 : 0;
    return { total, limit, percent };
  };

  async function handleBookSelect(val: string) {
    setCampaign(prev => ({ ...prev, book_id: val }));
    const book = addressBooks.find(b => b.id.toString() === val);
    if (book) setSelectedBookContacts(book.all_email_count);
  }

  async function handleSyncLeads() {
    if (!selectedBook) {
      toast.error("Selecione uma lista de destino");
      return;
    }
    setSyncing(true);
    try {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('email, name')
        .eq('agency_id', currentAgency?.id)
        .not('email', 'is', null)
        .in('status', ['ganhos', 'em_contato']);
      if (leadsError) throw leadsError;
      if (!leads || leads.length === 0) {
        toast.info("Nenhum lead qualificado encontrado para sincronização.");
        return;
      }
      const formattedEmails = leads.map(l => ({
        email: l.email,
        variables: { name: l.name }
      }));
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: { 
          action: 'add_emails', 
          book_id: parseInt(selectedBook),
          emails: formattedEmails
        }
      });
      if (error) throw error;
      toast.success(`${leads.length} leads sincronizados com sucesso!`);
      setSyncModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao sincronizar leads");
    } finally {
      setSyncing(false);
    }
  }

  async function handleCreateList() {
    if (!newListName) return;
    try {
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: { action: 'create_addressbook', name: newListName }
      });
      if (error) throw error;
      toast.success("Lista criada com sucesso!");
      setNewListName("");
      fetchAddressBooks();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar lista");
    }
  }

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
      if (result) {
        setCampaign(prev => ({ ...prev, body: result }));
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">E-mail Marketing</h2>
            {configured && accountInfo && (
              <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 px-3 py-1">
                {accountInfo.pricing_plan}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">Crie campanhas e gerencie suas listas de contatos com IA.</p>
        </div>
        {configured && (
          <div className="flex flex-wrap items-center gap-6 bg-card border rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-1.5 min-w-[160px]">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> E-mails</span>
                <span>{getEmailUsage().sent.toLocaleString()} / {getEmailUsage().limit.toLocaleString()}</span>
              </div>
              <Progress value={getEmailUsage().percent} className="h-1.5" />
            </div>
            <Separator orientation="vertical" className="h-8 hidden md:block" />
            <div className="space-y-1.5 min-w-[160px]">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Contatos</span>
                <span>{getContactUsage().total.toLocaleString()} / {getContactUsage().limit.toLocaleString()}</span>
              </div>
              <Progress value={getContactUsage().percent} className="h-1.5" />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => { fetchAddressBooks(); fetchAccountInfo(); }}
              disabled={loadingInfo}
            >
              <RefreshCw className={cn("h-4 w-4", loadingInfo && "animate-spin")} />
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="lists" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="lists">Listas de Contatos</TabsTrigger>
          <TabsTrigger value="campaign">Nova Campanha</TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Suas Listas na SendPulse</h3>
            <div className="flex flex-wrap gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Nova Lista
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Lista</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Input placeholder="Nome da Lista" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateList} disabled={!newListName}>Criar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={syncModalOpen} onOpenChange={setSyncModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Users className="h-4 w-4" /> Sincronizar do CRM
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sincronizar Leads</DialogTitle>
                    <DialogDescription>Selecione a lista de destino na SendPulse para importar leads "Ganhos" ou "Em Contato".</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Select onValueChange={setSelectedBook} value={selectedBook}>
                      <SelectTrigger><SelectValue placeholder="Selecione uma lista..." /></SelectTrigger>
                      <SelectContent>
                        {addressBooks.map(book => (
                          <SelectItem key={book.id} value={book.id.toString()}>{book.name} ({book.all_email_count} contatos)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSyncModalOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSyncLeads} disabled={syncing || !selectedBook}>
                      {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sincronizar agora
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button size="sm" className="gap-2" onClick={() => setImportOpen(true)}>
                <Mail className="h-4 w-4" /> Importar Planilha
              </Button>
            </div>
            <ImportSendpulseDialog open={importOpen} onOpenChange={setImportOpen} addressBooks={addressBooks} onSuccess={fetchAddressBooks} />
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Lista</TableHead>
                  <TableHead>Contatos</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addressBooks.length > 0 ? addressBooks.map((book) => (
                  <TableRow key={book.id}>
                    <TableCell className="font-medium">{book.name}</TableCell>
                    <TableCell>{book.all_email_count}</TableCell>
                    <TableCell>{new Date(book.created).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`https://login.sendpulse.com/addressbooks/emails/id/${book.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma lista encontrada.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="campaign">
          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Coluna Esquerda: O Estúdio */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex justify-between items-center bg-card p-4 border rounded-t-xl">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      O Estúdio
                    </h3>
                    <Dialog open={aiPromptOpen} onOpenChange={setAiPromptOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-primary hover:bg-primary/5 shadow-sm">
                          ✨ Escrever com IA
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>O que você quer escrever?</DialogTitle>
                          <DialogDescription>Descreva o objetivo do e-mail e nossa IA criará o conteúdo para você.</DialogDescription>
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
                  </div>
                  <div className="bg-card border border-t-0 rounded-b-xl p-6 shadow-sm min-h-[500px]">
                    <Textarea 
                      placeholder="Escreva aqui o corpo do e-mail (aceita HTML)..." 
                      className="min-h-[480px] font-mono text-sm p-4 leading-relaxed border-none focus-visible:ring-0 resize-none bg-transparent"
                      value={campaign.body}
                      onChange={e => setCampaign(prev => ({ ...prev, body: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Coluna Direita: Configuração e Voo */}
                <div className="lg:col-span-4 space-y-6">
                  <Card className="shadow-sm border-muted/60">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base font-semibold">Configuração e Voo</CardTitle>
                      <CardDescription>Ajuste os detalhes finais antes de disparar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Remetente</label>
                          <Input placeholder="Nome (Ex: Orbity)" value={campaign.sender_name} onChange={e => setCampaign(prev => ({ ...prev, sender_name: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">E-mail do Remetente</label>
                          <Input type="email" placeholder="contato@suaagencia.com" value={campaign.sender_email} onChange={e => setCampaign(prev => ({ ...prev, sender_email: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Assunto</label>
                          <Input placeholder="Assunto cativante..." value={campaign.subject} onChange={e => setCampaign(prev => ({ ...prev, subject: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Lista de Destino</label>
                          <Select onValueChange={handleBookSelect} value={campaign.book_id}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecione os destinatários..." />
                            </SelectTrigger>
                            <SelectContent>
                              {addressBooks.map(book => (
                                <SelectItem key={book.id} value={book.id.toString()}>{book.name} ({book.all_email_count} contatos)</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {selectedBookContacts !== null && accountInfo && selectedBookContacts > (accountInfo.email_limit - accountInfo.email_qty) && (
                            <Alert variant="destructive" className="mt-2 py-2 px-3 bg-amber-50 border-amber-200 text-amber-800">
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                              <AlertDescription className="text-xs">
                                Atenção: Esta lista ({selectedBookContacts}) excede o saldo restante do seu plano ({accountInfo.email_limit - accountInfo.email_qty}).
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>

                      <Separator className="bg-muted/60" />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <h4 className="text-sm font-medium">Agendamento</h4>
                            <p className="text-xs text-muted-foreground">{scheduled ? "Data/Hora selecionada" : "Enviar imediatamente"}</p>
                          </div>
                          <Switch checked={scheduled} onCheckedChange={setScheduled} />
                        </div>
                        
                        {scheduled && (
                          <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold uppercase text-muted-foreground">Data de Envio</label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-9", !scheduledDate && "text-muted-foreground")}>
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {scheduledDate ? format(scheduledDate, "PPP") : <span>Selecione uma data</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <CalendarComponent mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus disabled={(date) => date < new Date()} />
                                </PopoverContent>
                              </Popover>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-semibold uppercase text-muted-foreground">Horário</label>
                              <Select value={scheduledTime} onValueChange={setScheduledTime}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 24 }).map((_, i) => (
                                    <SelectItem key={i} value={`${String(i).padStart(2, '0')}:00`}>{String(i).padStart(2, '0')}:00</SelectItem>
                                  ))}
                                  {Array.from({ length: 24 }).map((_, i) => (
                                    <SelectItem key={i + 24} value={`${String(i).padStart(2, '0')}:30`}>{String(i).padStart(2, '0')}:30</SelectItem>
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
                          className={cn(
                            "w-full gap-2 h-12 text-base font-semibold transition-all duration-300 shadow-md",
                            scheduled ? "bg-amber-600 hover:bg-amber-700" : "bg-primary hover:bg-primary/90"
                          )} 
                          onClick={handleSendCampaign} 
                          disabled={sending}
                        >
                          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : (scheduled ? <Calendar className="h-5 w-5" /> : <Send className="h-5 w-5" />)}
                          {scheduled ? "🗓️ Confirmar Agendamento" : "🚀 Disparar Agora"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
