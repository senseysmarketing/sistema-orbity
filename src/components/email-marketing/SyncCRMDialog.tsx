import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useLeadStatuses } from "@/hooks/useLeadStatuses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAgency } from "@/hooks/useAgency";

interface SyncCRMDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addressBooks: any[];
  onSuccess: () => void;
}

export function SyncCRMDialog({ open, onOpenChange, addressBooks, onSuccess }: SyncCRMDialogProps) {
  const { currentAgency } = useAgency();
  const { statuses, loading: loadingStatuses } = useLeadStatuses();
  const [step, setStep] = useState(1);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [targetBookId, setTargetBookId] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [previewCount, setPreviewCount] = useState<number>(0);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedStatuses([]);
      setTargetBookId("");
      setPreviewCount(0);
    }
  }, [open]);

  useEffect(() => {
    if (selectedStatuses.length > 0) {
      updatePreviewCount();
    } else {
      setPreviewCount(0);
    }
  }, [selectedStatuses]);

  async function updatePreviewCount() {
    if (!currentAgency?.id) return;
    setLoadingPreview(true);
    try {
      const { count, error } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', currentAgency.id)
        .not('email', 'is', null)
        .in('status', selectedStatuses);
      
      if (error) throw error;
      setPreviewCount(count || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPreview(false);
    }
  }

  const toggleStatus = (statusId: string) => {
    setSelectedStatuses(prev => 
      prev.includes(statusId) 
        ? prev.filter(s => s !== statusId)
        : [...prev, statusId]
    );
  };

  async function handleSync() {
    if (!targetBookId || selectedStatuses.length === 0) return;
    
    setSyncing(true);
    try {
      // 1. Fetch leads with email and name
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('email, name')
        .eq('agency_id', currentAgency?.id)
        .not('email', 'is', null)
        .in('status', selectedStatuses);

      if (leadsError) throw leadsError;

      if (!leads || leads.length === 0) {
        toast.info("Nenhum lead encontrado para os critérios selecionados.");
        return;
      }

      // 2. Format for SendPulse
      const formattedEmails = leads.map(l => ({
        email: l.email,
        variables: { name: l.name || "" }
      }));

      // 3. Call Edge Function
      const { error } = await supabase.functions.invoke('sendpulse-api', {
        body: { 
          action: 'add_emails', 
          book_id: parseInt(targetBookId),
          emails: formattedEmails
        }
      });

      if (error) throw error;

      toast.success(`${leads.length} leads sincronizados com sucesso!`);
      onSuccess();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao sincronizar leads com o CRM");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className={syncing ? "h-5 w-5 animate-spin" : "h-5 w-5"} />
            Sincronizar do CRM
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Passo 1: Selecione quais status de leads deseja sincronizar." 
              : "Passo 2: Escolha a lista de destino na SendPulse."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {loadingStatuses ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  statuses?.map((status: any) => (
                    <div key={status.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                      <Checkbox 
                        id={`status-${status.id}`} 
                        checked={selectedStatuses.includes(status.id)}
                        onCheckedChange={() => toggleStatus(status.id)}
                      />
                      <Label 
                        htmlFor={`status-${status.id}`} 
                        className="flex-1 cursor-pointer flex items-center justify-between"
                      >
                        <span className="capitalize">{status.name.replace(/_/g, ' ')}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {status.id}
                        </Badge>
                      </Label>
                    </div>
                  ))
                )}
              </div>

              {selectedStatuses.length > 0 && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <p className="text-xs text-primary font-medium">
                    {loadingPreview ? "Calculando..." : `${previewCount} leads encontrados com e-mail válido.`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Lista de Destino</Label>
                <Select value={targetBookId} onValueChange={setTargetBookId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a lista..." />
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

              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Resumo da Sincronização</p>
                <div className="flex justify-between text-sm">
                  <span>Leads selecionados:</span>
                  <span className="font-semibold text-primary">{previewCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Lista destino:</span>
                  <span className="font-semibold">{addressBooks.find(b => b.id.toString() === targetBookId)?.name || "-"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 1 ? (
            <Button 
              className="w-full" 
              disabled={selectedStatuses.length === 0 || loadingPreview}
              onClick={() => setStep(2)}
            >
              Próximo Passo
            </Button>
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button 
                className="flex-1" 
                disabled={!targetBookId || syncing}
                onClick={handleSync}
              >
                {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Sincronização
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
