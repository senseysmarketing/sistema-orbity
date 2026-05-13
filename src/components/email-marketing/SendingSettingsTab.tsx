import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AtSign, Globe, Plus, Trash2, Copy, AlertCircle, CheckCircle2, Clock, Loader2, ExternalLink, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSendPulseSenders, useSendPulseDomains, useSendPulseInvalidate } from "@/hooks/useSendPulse";
import { AddSenderDialog } from "./AddSenderDialog";
import { cn } from "@/lib/utils";

function isSenderActive(s: any) {
  return s?.status === "Active" || s?.is_activated === true || s?.status === 1;
}

function CopyButton({ value }: { value: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={() => {
        navigator.clipboard.writeText(value);
        toast.success("Copiado!");
      }}
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}

export function SendingSettingsTab() {
  const sendersQuery = useSendPulseSenders();
  const domainsQuery = useSendPulseDomains();
  const invalidate = useSendPulseInvalidate();

  const [addSenderOpen, setAddSenderOpen] = useState(false);
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [dnsDialogDomain, setDnsDialogDomain] = useState<string | null>(null);

  const senders: any[] = sendersQuery.data ?? [];
  const domains: any[] = domainsQuery.data ?? [];

  async function handleDeleteSender(email: string) {
    if (!confirm(`Remover o remetente ${email}?`)) return;
    try {
      const { error } = await supabase.functions.invoke("sendpulse-api", {
        body: { action: "delete_sender", sender_email: email },
      });
      if (error) throw error;
      toast.success("Remetente removido");
      invalidate.invalidateSenders();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao remover remetente", { description: e.message });
    }
  }

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault();
    const clean = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!clean || !clean.includes(".")) {
      toast.error("Informe um domínio válido (ex: minhaagencia.com.br)");
      return;
    }
    setAddingDomain(true);
    try {
      const { data, error } = await supabase.functions.invoke("sendpulse-api", {
        body: { action: "add_domain", domain: clean },
      });
      if (error) throw error;
      if (data?.error_code || data?.message === "Not Found") {
        throw new Error(data?.message || "Não foi possível adicionar o domínio");
      }
      toast.success("Domínio adicionado!", {
        description: "Configure os registros DNS para autenticá-lo.",
      });
      invalidate.invalidateDomains();
      setNewDomain("");
      setAddDomainOpen(false);
      setDnsDialogDomain(clean);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao adicionar domínio", { description: e.message });
    } finally {
      setAddingDomain(false);
    }
  }

  async function handleDeleteDomain(domain: string) {
    if (!confirm(`Remover o domínio ${domain}?`)) return;
    try {
      const { error } = await supabase.functions.invoke("sendpulse-api", {
        body: { action: "delete_domain", domain },
      });
      if (error) throw error;
      toast.success("Domínio removido");
      invalidate.invalidateDomains();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao remover domínio", { description: e.message });
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CARD A: Remetentes */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AtSign className="h-4 w-4 text-primary" /> E-mails Remetentes Autorizados
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                E-mails verificados que podem disparar campanhas.
              </CardDescription>
            </div>
            <Button size="sm" variant="action" className="gap-1.5" onClick={() => setAddSenderOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {sendersQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : senders.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum remetente cadastrado ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {senders.map((s: any) => {
                const active = isSenderActive(s);
                return (
                  <div key={s.email} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/30 hover:bg-card/60 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{s.name || s.email.split("@")[0]}</span>
                        {active ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Verificado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] gap-1">
                            <Clock className="h-2.5 w-2.5" /> Pendente
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground truncate block">{s.email}</span>
                      {!active && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1 leading-tight">
                          ⚠️ Verifique sua caixa de entrada e clique no link enviado pela SendPulse para ativar este e-mail.
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDeleteSender(s.email)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CARD B: Domínios */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" /> Autenticação de Domínio
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Domínios autenticados (SPF/DKIM) para máxima entregabilidade.
              </CardDescription>
            </div>
            <Button size="sm" variant="action" className="gap-1.5" onClick={() => setAddDomainOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Autenticar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {domainsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhum domínio autenticado ainda.
              <p className="text-xs mt-2">Autenticar seu domínio aumenta drasticamente a entregabilidade.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {domains.map((d: any) => {
                const verified = d?.status === 1 || d?.status === "1" || d?.is_verified === true;
                const domainName = d?.domain || d?.email;
                return (
                  <div key={domainName} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/30 hover:bg-card/60 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{domainName}</span>
                        {verified ? (
                          <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] gap-1">
                            <ShieldCheck className="h-2.5 w-2.5" /> Autenticado
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] gap-1">
                            <Clock className="h-2.5 w-2.5" /> Pendente DNS
                          </Badge>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setDnsDialogDomain(domainName)}
                        className="text-xs text-primary hover:underline mt-0.5"
                      >
                        Ver registros DNS →
                      </button>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDeleteDomain(domainName)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddSenderDialog open={addSenderOpen} onOpenChange={setAddSenderOpen} onSuccess={() => invalidate.invalidateSenders()} />

      <Dialog open={addDomainOpen} onOpenChange={setAddDomainOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Autenticar Novo Domínio</DialogTitle>
            <DialogDescription>
              Insira o domínio que deseja autenticar. Após adicionar, configure os registros DNS no painel do seu provedor (GoDaddy, Cloudflare, Registro.br, etc.).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDomain} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-domain">Domínio</Label>
              <Input
                id="new-domain"
                placeholder="minhaagencia.com.br"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Sem "www" e sem "https://". Apenas o domínio raiz.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDomainOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={addingDomain}>
                {addingDomain && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar Domínio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {dnsDialogDomain && (
        <DnsRecordsDialog
          domain={dnsDialogDomain}
          open={!!dnsDialogDomain}
          onOpenChange={(o) => !o && setDnsDialogDomain(null)}
          onVerified={() => invalidate.invalidateDomains()}
        />
      )}
    </div>
  );
}

function DnsRecordsDialog({
  domain,
  open,
  onOpenChange,
  onVerified,
}: {
  domain: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("sendpulse-api", {
        body: { action: "get_domain_records", domain },
      });
      if (error) throw error;
      setData(result);
    } catch (e: any) {
      toast.error("Erro ao buscar registros DNS", { description: e.message });
    } finally {
      setLoading(false);
    }
  };

  // Fetch on open
  useState(() => {
    if (open) fetchRecords();
  });
  // Trigger fetch when opens
  if (open && !data && !loading) fetchRecords();

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const { error } = await supabase.functions.invoke("sendpulse-api", {
        body: { action: "verify_domain", domain },
      });
      if (error) throw error;
      toast.success("Verificação iniciada!", { description: "A SendPulse irá checar os registros DNS." });
      await fetchRecords();
      onVerified();
    } catch (e: any) {
      toast.error("Erro na verificação", { description: e.message });
    } finally {
      setVerifying(false);
    }
  };

  // Build records array from various response shapes
  const records: Array<{ type: string; name: string; value: string; purpose: string }> = [];
  if (data) {
    // SPF
    const spf = data.spf || data.SPF;
    if (spf) records.push({ type: "TXT", name: typeof spf === "object" ? (spf.host || "@") : "@", value: typeof spf === "object" ? (spf.value || spf.txt) : spf, purpose: "SPF (Autenticação)" });
    // DKIM
    const dkim = data.dkim || data.DKIM;
    if (dkim) records.push({ type: "TXT", name: typeof dkim === "object" ? (dkim.host || dkim.selector || "sp._domainkey") : "sp._domainkey", value: typeof dkim === "object" ? (dkim.value || dkim.txt) : dkim, purpose: "DKIM (Assinatura digital)" });
    // Tracking
    const tracking = data.tracking || data.cname;
    if (tracking) records.push({ type: "CNAME", name: typeof tracking === "object" ? (tracking.host || "track") : "track", value: typeof tracking === "object" ? (tracking.value || tracking.target) : tracking, purpose: "Tracking de cliques/aberturas" });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Configuração de DNS
          </DialogTitle>
          <DialogDescription>
            Domínio: <span className="font-mono text-foreground">{domain}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-amber-800 dark:text-amber-300">Registros não disponíveis</p>
                <p className="text-amber-700 dark:text-amber-400 mt-1">
                  A SendPulse ainda não retornou registros DNS para este domínio. Tente atualizar em alguns minutos.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Tipo</TableHead>
                    <TableHead>Nome / Host</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">{r.type}</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">{r.purpose}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">{r.name}</span>
                          <CopyButton value={r.name} />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[200px]" title={r.value}>{r.value}</span>
                          <CopyButton value={r.value} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs space-y-1">
            <p className="font-medium text-foreground flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-blue-500" /> Como configurar
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Estes registros devem ser inseridos na zona de DNS do seu provedor (GoDaddy, Cloudflare, Registro.br...). Após adicioná-los, aguarde a propagação (até 48h) e clique em "Verificar Agora".
            </p>
            <a
              href="https://login.sendpulse.com/settings/#smtp-domains"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
            >
              Caso tenha dificuldades, configure diretamente no painel da SendPulse
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={fetchRecords} disabled={loading} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Atualizar
          </Button>
          <Button onClick={handleVerify} disabled={verifying} className="gap-1.5">
            {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Verificar Agora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
