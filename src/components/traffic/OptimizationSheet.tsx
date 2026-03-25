import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Lightbulb, Palette, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type OptimizationStatus = "running" | "winner" | "loser";

interface OptimizationRecord {
  id: string;
  date: string;
  action: string;
  status: OptimizationStatus;
  creativesCount: number;
  observations: string;
}

interface OptimizationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  adAccountId: string;
}

const INITIAL_MOCK: OptimizationRecord[] = [
  {
    id: "mock-1",
    date: "2025-03-10",
    action: "Pausada campanha de conversão antiga e subido novo criativo em vídeo para teste A/B.",
    status: "loser",
    creativesCount: 1,
    observations: "Cliente pediu para focar em leads qualificados.",
  },
  {
    id: "mock-2",
    date: "2025-03-15",
    action: "Alterado público-alvo: removido interesse amplo e adicionado lookalike 1% dos compradores.",
    status: "winner",
    creativesCount: 0,
    observations: "CPA caiu 35% após a mudança.",
  },
  {
    id: "mock-3",
    date: "2025-03-22",
    action: "Subidos 3 novos criativos estáticos e 1 carrossel para campanha de remarketing.",
    status: "running",
    creativesCount: 4,
    observations: "Aguardando 72h de aprendizado antes de analisar.",
  },
];

const STATUS_CONFIG: Record<OptimizationStatus, { label: string; dotClass: string; badgeClass: string }> = {
  running: {
    label: "Em Rodagem",
    dotClass: "bg-blue-500",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  winner: {
    label: "Vencedor",
    dotClass: "bg-green-500",
    badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  loser: {
    label: "Perdedor",
    dotClass: "bg-red-500",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

export function OptimizationSheet({ isOpen, onClose, clientName, adAccountId }: OptimizationSheetProps) {
  const [history, setHistory] = useState<OptimizationRecord[]>(INITIAL_MOCK);

  // Form state
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [action, setAction] = useState("");
  const [status, setStatus] = useState<OptimizationStatus | "">("");
  const [creativesCount, setCreativesCount] = useState(0);
  const [observations, setObservations] = useState("");
  const [remindEnabled, setRemindEnabled] = useState(false);
  const [remindDays, setRemindDays] = useState(3);

  const resetForm = () => {
    setDate(new Date());
    setAction("");
    setStatus("");
    setCreativesCount(0);
    setObservations("");
    setRemindEnabled(false);
    setRemindDays(3);
  };

  const handleSave = () => {
    if (!action.trim() || !status || !date) {
      toast.error("Preencha a ação realizada e o status do teste.");
      return;
    }

    const newRecord: OptimizationRecord = {
      id: crypto.randomUUID(),
      date: format(date, "yyyy-MM-dd"),
      action: action.trim(),
      status: status as OptimizationStatus,
      creativesCount,
      observations: observations.trim(),
    };

    setHistory((prev) =>
      [newRecord, ...prev].sort((a, b) => b.date.localeCompare(a.date))
    );
    resetForm();
    toast.success("Registro salvo com sucesso!");
  };

  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-lg w-full flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Diário de Otimizações
          </SheetTitle>
          <SheetDescription>{clientName}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6">
          {/* ── Form ── */}
          <div className="space-y-4 pb-4">
            <div className="space-y-1.5">
              <Label>Data da Ação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label>O que foi feito? (Hipótese / Ação)</Label>
              <Textarea
                placeholder="Ex: Pausada campanha X e subido novo vídeo Y"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status do Teste</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as OptimizationStatus)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running">🔵 Em Rodagem</SelectItem>
                    <SelectItem value="winner">🟢 Vencedor</SelectItem>
                    <SelectItem value="loser">🔴 Perdedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Novos Criativos</Label>
                <Input
                  type="number"
                  min={0}
                  value={creativesCount}
                  onChange={(e) => setCreativesCount(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações / Pedidos ao Cliente</Label>
              <Textarea
                placeholder="Notas adicionais..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remind"
                  checked={remindEnabled}
                  onCheckedChange={(v) => setRemindEnabled(!!v)}
                />
                <Label htmlFor="remind" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
                  <Bell className="h-3.5 w-3.5" />
                  Lembrar de analisar este teste
                </Label>
              </div>
              {remindEnabled && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-muted-foreground">em</span>
                  <Input
                    type="number"
                    min={1}
                    className="w-16 h-8"
                    value={remindDays}
                    onChange={(e) => setRemindDays(Number(e.target.value) || 1)}
                  />
                  <span className="text-sm text-muted-foreground">dias</span>
                </div>
              )}
            </div>

            <Button onClick={handleSave} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Salvar Registro
            </Button>
          </div>

          <Separator />

          {/* ── Timeline ── */}
          <div className="py-4">
            <h4 className="text-sm font-semibold text-muted-foreground mb-4">
              Histórico ({sorted.length})
            </h4>

            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum registro ainda.
              </p>
            ) : (
              <div className="relative ml-3">
                {/* Vertical line */}
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-border" />

                {sorted.map((record, idx) => {
                  const cfg = STATUS_CONFIG[record.status];
                  return (
                    <div key={record.id} className="relative pl-6 pb-6 last:pb-0">
                      {/* Dot */}
                      <div
                        className={cn(
                          "absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-background -translate-x-[5px]",
                          cfg.dotClass
                        )}
                      />

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-muted-foreground">
                            {format(new Date(record.date + "T12:00:00"), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                          </span>
                          <Badge className={cn("text-[10px] px-1.5 py-0", cfg.badgeClass)}>
                            {cfg.label}
                          </Badge>
                          {record.creativesCount > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              <Palette className="h-3 w-3 mr-0.5" />
                              {record.creativesCount} criativo{record.creativesCount > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{record.action}</p>
                        {record.observations && (
                          <p className="text-xs text-muted-foreground italic">
                            {record.observations}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
