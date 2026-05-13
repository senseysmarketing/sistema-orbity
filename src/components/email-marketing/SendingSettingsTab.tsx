import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AtSign, Globe, Plus, Trash2, CheckCircle2, Clock, ExternalLink, ShieldCheck, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSendPulseSenders, useSendPulseInvalidate } from "@/hooks/useSendPulse";
import { AddSenderDialog } from "./AddSenderDialog";
import { EditSenderDialog } from "./EditSenderDialog";

function isSenderActive(s: any) {
  return s?.status === "Active" || s?.is_activated === true || s?.status === 1;
}

export function SendingSettingsTab() {
  const sendersQuery = useSendPulseSenders();
  const invalidate = useSendPulseInvalidate();

  const [addSenderOpen, setAddSenderOpen] = useState(false);
  const [editSenderOpen, setEditSenderOpen] = useState(false);
  const [selectedSender, setSelectedSender] = useState<any>(null);

  const senders: any[] = sendersQuery.data ?? [];

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

  function handleEditSender(sender: any) {
    setSelectedSender(sender);
    setEditSenderOpen(true);
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
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => handleEditSender(s)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => handleDeleteSender(s.email)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CARD B: Autenticação de Domínio (Guia Estático) */}
      <Card className="border shadow-sm overflow-hidden flex flex-col">
        <CardHeader className="pb-4 border-b bg-muted/30">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Autenticação de Domínio (DKIM/SPF)
          </CardTitle>
          <CardDescription className="text-xs">
            Aumente a entregabilidade e evite que seus e-mails caiam no SPAM.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para garantir que as suas campanhas caiam na <strong>Caixa de Entrada</strong> e não no SPAM, é obrigatório autenticar o seu domínio (ex: agencia.com.br).
            </p>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Aceda à SendPulse</p>
                  <p className="text-xs text-muted-foreground">Clique no botão abaixo para abrir a página de configurações de domínio na SendPulse.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Copie os Registros</p>
                  <p className="text-xs text-muted-foreground">Adicione o seu domínio e copie os registros TXT (SPF e DKIM) gerados.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Configure o seu DNS</p>
                  <p className="text-xs text-muted-foreground">Cole os registros no seu provedor de DNS (Cloudflare, GoDaddy, HostGator, etc).</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 flex gap-3">
              <Check className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-tight">
                Uma vez configurado, a SendPulse verificará automaticamente. Este processo é feito apenas uma vez por domínio.
              </p>
            </div>
          </div>

          <Button 
            variant="default" 
            className="w-full gap-2 shadow-sm"
            onClick={() => window.open("https://login.sendpulse.com/emailservice/settings/#domains", "_blank")}
          >
            Configurar na SendPulse <ExternalLink className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddSenderDialog 
        open={addSenderOpen} 
        onOpenChange={setAddSenderOpen} 
        onSuccess={() => invalidate.invalidateSenders()} 
      />

      <EditSenderDialog
        sender={selectedSender}
        open={editSenderOpen}
        onOpenChange={setEditSenderOpen}
        onSuccess={() => invalidate.invalidateSenders()}
      />
    </div>
  );
}
