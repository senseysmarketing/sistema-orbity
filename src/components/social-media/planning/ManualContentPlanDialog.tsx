import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { ManualPlanInput } from "@/hooks/useContentPlanning";

interface ManualContentPlanDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: ManualPlanInput) => Promise<string | null>;
  saving?: boolean;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function ManualContentPlanDialog({ open, onClose, onCreate, saving = false }: ManualContentPlanDialogProps) {
  const { currentAgency } = useAgency();
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [monthYear, setMonthYear] = useState(getCurrentMonth());
  const [strategyNotes, setStrategyNotes] = useState("");
  const [active, setActive] = useState(true);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-planning-manual", currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("agency_id", currentAgency.id)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentAgency?.id && open,
  });

  const selectedClientName = useMemo(() => clients.find((client) => client.id === clientId)?.name || "", [clients, clientId]);

  useEffect(() => {
    if (!open) return;
    setClientId("");
    setTitle("");
    setMonthYear(getCurrentMonth());
    setStrategyNotes("");
    setActive(true);
  }, [open]);

  useEffect(() => {
    if (!selectedClientName || title.trim()) return;
    const [year, month] = monthYear.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    const monthLabel = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    setTitle(`Planejamento ${selectedClientName} - ${monthLabel}`);
  }, [selectedClientName, monthYear, title]);

  const handleSubmit = async () => {
    const planId = await onCreate({
      clientId,
      title,
      monthYear,
      status: active ? "active" : "draft",
      strategyNotes,
    });
    if (planId) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            Novo Planejamento Manual
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
            <div className="space-y-2">
              <Label>Titulo *</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Planejamento do mes" />
            </div>
            <div className="space-y-2">
              <Label>Mes *</Label>
              <Input type="month" value={monthYear} onChange={(event) => setMonthYear(event.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contexto estrategico</Label>
            <Textarea
              value={strategyNotes}
              onChange={(event) => setStrategyNotes(event.target.value)}
              rows={4}
              placeholder="Direcionamentos do mes, campanha, foco comercial ou observacoes para o time."
            />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Status ativo</p>
              <p className="text-xs text-muted-foreground">Planejamentos em rascunho ficam salvos, mas separados no filtro.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving || !clientId || !title.trim() || !monthYear}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar planejamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
