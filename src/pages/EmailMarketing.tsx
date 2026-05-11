import { useState, useEffect } from "react";
import { Mail, RefreshCw, Send, Plus, Search, ExternalLink, Loader2, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
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

export default function EmailMarketing() {
  const { currentAgency } = useAgency();
  const { loading: aiLoading, callAI } = useAIAssist() as any; // Cast as any if typing is strict and doesn't have custom actions
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [addressBooks, setAddressBooks] = useState<any[]>([]);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [balance, setBalance] = useState<any>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [selectedBookContacts, setSelectedBookContacts] = useState<number | null>(null);
  
  // Campaign form
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
      const { data, error } = await supabase
        .from('agency_integrations')
        .select('sendpulse_client_id, sendpulse_client_secret')
        .eq('agency_id', currentAgency.id)
        .single();

      if (data?.sendpulse_client_id && data?.sendpulse_client_secret) {
        setConfigured(true);
        fetchAddressBooks();
        fetchBalance();
      } else {
        setConfigured(false);
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

  async function fetchBalance() {
    setLoadingBalance(true);
    try {
      const { data, error } = await supabase.functions.invoke('sendpulse-api', {
        body: { action: 'get_balance' }
      });
      if (error) throw error;
      setBalance(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBalance(false);
    }
  }

  const getEmailBalance = () => {
    if (!balance) return null;
    // Handle both /user/balance/detail and legacy /balance
    return balance?.email?.emails_left ?? balance?.email?.balance ?? balance?.[0]?.balance ?? 0;
  };

  async function handleBookSelect(val: string) {
    setCampaign(prev => ({ ...prev, book_id: val }));
    const book = addressBooks.find(b => b.id.toString() === val);
    if (book) {
      setSelectedBookContacts(book.all_email_count);
    }
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

      const { data, error } = await supabase.functions.invoke('sendpulse-api', {
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

  async function handleSendCampaign() {
    const { sender_name, sender_email, subject, body, book_id } = campaign;
    if (!sender_name || !sender_email || !subject || !body || !book_id) {
      toast.error("Preencha todos os campos da campanha");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('sendpulse-api', {
        body: { 
          action: 'create_campaign',
          ...campaign,
          book_id: parseInt(book_id)
        }
      });

      if (error) throw error;
      toast.success("Campanha enviada com sucesso!");
      setCampaign({ sender_name: "", sender_email: "", subject: "", body: "", book_id: "" });
    } catch (e) {
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
        toast.error("Erro ao enviar campanha");
      }
    } finally {
      setSending(false);
    }
  }

  async function handleAIGenerate() {
    if (!aiPrompt) return;
    
    try {
      // Using generic callAI from useAIAssist if available, otherwise we'd need to add a type
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
            {configured && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="h-7 px-3 font-medium bg-background border-muted-foreground/20 text-muted-foreground animate-in fade-in slide-in-from-left-2 duration-500">
                      {loadingBalance ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      ) : (
                        <Wallet className="h-3 w-3 mr-1.5 text-primary/60" />
                      )}
                      Saldo SendPulse: {getEmailBalance()?.toLocaleString() ?? '...'} e-mails
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Este é o limite do seu plano atual na SendPulse</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-muted-foreground">
            Crie campanhas e gerencie suas listas de contatos com IA.
          </p>
        </div>
      </div>

      <Tabs defaultValue="lists" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="lists">Listas de Contatos</TabsTrigger>
          <TabsTrigger value="campaign">Nova Campanha</TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Suas Listas na SendPulse</h3>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">➕ Nova Lista</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Lista</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <Input 
                      placeholder="Nome da Lista" 
                      value={newListName} 
                      onChange={(e) => setNewListName(e.target.value)} 
                    />
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateList} disabled={!newListName}>Criar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={syncModalOpen} onOpenChange={setSyncModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">🔄 Sincronizar do CRM</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Sincronizar Leads</DialogTitle>
                    <DialogDescription>
                      Selecione a lista de destino na SendPulse para importar leads "Ganhos" ou "Em Contato".
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Select onValueChange={setSelectedBook} value={selectedBook}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma lista..." />
                      </SelectTrigger>
                      <SelectContent>
                        {addressBooks.map(book => (
                          <SelectItem key={book.id} value={book.id.toString()}>
                            {book.name} ({book.all_email_count} contatos)
                          </SelectItem>
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
              <Button onClick={() => setImportOpen(true)}>📥 Importar Planilha</Button>
            </div>
            <ImportSendpulseDialog 
              open={importOpen} 
              onOpenChange={setImportOpen} 
              addressBooks={addressBooks} 
              onSuccess={fetchAddressBooks} 
            />
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
                {addressBooks.length > 0 ? (
                  addressBooks.map((book) => (
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma lista encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="campaign">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Campanha</CardTitle>
              <CardDescription>Configure os parâmetros de envio e o conteúdo do e-mail.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Remetente</label>
                  <Input 
                    placeholder="Ex: Orbity Marketing" 
                    value={campaign.sender_name}
                    onChange={e => setCampaign(prev => ({ ...prev, sender_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail do Remetente</label>
                  <Input 
                    type="email" 
                    placeholder="Ex: contato@suaagencia.com" 
                    value={campaign.sender_email}
                    onChange={e => setCampaign(prev => ({ ...prev, sender_email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Assunto</label>
                <Input 
                  placeholder="Assunto do e-mail..." 
                  value={campaign.subject}
                  onChange={e => setCampaign(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Lista de Destino</label>
                <Select onValueChange={handleBookSelect} value={campaign.book_id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione para quem enviar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {addressBooks.map(book => (
                      <SelectItem key={book.id} value={book.id.toString()}>
                        {book.name} ({book.all_email_count} contatos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBookContacts !== null && (
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground px-1">
                    <Users className="h-3 w-3" />
                    <span>Esta lista possui <strong>{selectedBookContacts}</strong> contatos.</span>
                    {getEmailBalance() !== null && selectedBookContacts > (getEmailBalance() || 0) && (
                      <span className="text-destructive font-medium flex items-center gap-1">
                        (Saldo insuficiente: {getEmailBalance()?.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Conteúdo do E-mail</label>
                  <Dialog open={aiPromptOpen} onOpenChange={setAiPromptOpen}>
                    <DialogTrigger asChild>
                      <Button variant="secondary" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Escrever com IA
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>O que você quer escrever?</DialogTitle>
                        <DialogDescription>
                          Descreva o objetivo do e-mail e nossa IA criará o conteúdo para você.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Textarea 
                          placeholder="Ex: Oferta de serviço de gestão de tráfego para novos leads..." 
                          value={aiPrompt}
                          onChange={e => setAiPrompt(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAiPromptOpen(false)}>Cancelar</Button>
                        <Button onClick={handleAIGenerate} disabled={aiLoading || !aiPrompt}>
                          {aiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Gerar Conteúdo
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <Textarea 
                  placeholder="Escreva aqui o corpo do e-mail (aceita HTML)..." 
                  className="min-h-[300px] font-mono text-sm"
                  value={campaign.body}
                  onChange={e => setCampaign(prev => ({ ...prev, body: e.target.value }))}
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button 
                  variant="action" 
                  size="lg" 
                  className="gap-2" 
                  onClick={handleSendCampaign}
                  disabled={sending}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar Campanha
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
