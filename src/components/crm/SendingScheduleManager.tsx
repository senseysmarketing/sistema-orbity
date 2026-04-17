import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Save, Loader2, CalendarDays, Briefcase, Sun, Infinity as InfinityIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/hooks/useAgency";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SendingSchedule {
  enabled: boolean;
  start_hour: number;
  end_hour: number;
  allowed_days: number[];
}

const DEFAULT_SCHEDULE: SendingSchedule = {
  enabled: false,
  start_hour: 8,
  end_hour: 18,
  allowed_days: [1, 2, 3, 4, 5],
};

const DAYS_OF_WEEK = [
  { value: 0, label: "Dom", short: "D" },
  { value: 1, label: "Seg", short: "S" },
  { value: 2, label: "Ter", short: "T" },
  { value: 3, label: "Qua", short: "Q" },
  { value: 4, label: "Qui", short: "Q" },
  { value: 5, label: "Sex", short: "S" },
  { value: 6, label: "Sáb", short: "S" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function SendingScheduleManager() {
  const { currentAgency } = useAgency();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: account, isLoading } = useQuery({
    queryKey: ['whatsapp-account-schedule', currentAgency?.id],
    queryFn: async () => {
      if (!currentAgency?.id) return null;
      const { data, error } = await supabase
        .from('whatsapp_accounts')
        .select('id, sending_schedule')
        .eq('agency_id', currentAgency.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentAgency?.id,
  });

  const savedSchedule = (account?.sending_schedule as unknown as SendingSchedule) || DEFAULT_SCHEDULE;

  const [enabled, setEnabled] = useState(savedSchedule.enabled);
  const [startHour, setStartHour] = useState(savedSchedule.start_hour);
  const [endHour, setEndHour] = useState(savedSchedule.end_hour);
  const [allowedDays, setAllowedDays] = useState<number[]>(savedSchedule.allowed_days);

  useEffect(() => {
    if (account?.sending_schedule) {
      const s = account.sending_schedule as unknown as SendingSchedule;
      setEnabled(s.enabled);
      setStartHour(s.start_hour);
      setEndHour(s.end_hour);
      setAllowedDays(s.allowed_days);
    }
  }, [account]);

  const hasChanges =
    enabled !== savedSchedule.enabled ||
    startHour !== savedSchedule.start_hour ||
    endHour !== savedSchedule.end_hour ||
    JSON.stringify([...allowedDays].sort()) !== JSON.stringify([...savedSchedule.allowed_days].sort());

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!account?.id) throw new Error("Conta WhatsApp não encontrada");
      const schedule: SendingSchedule = {
        enabled,
        start_hour: startHour,
        end_hour: endHour,
        allowed_days: allowedDays,
      };
      const { error } = await supabase
        .from('whatsapp_accounts')
        .update({ sending_schedule: schedule as any })
        .eq('id', account.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-account-schedule'] });
      toast({ title: 'Horários salvos!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  const toggleDay = (day: number) => {
    setAllowedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const applyPreset = (preset: 'business' | 'extended' | 'always') => {
    if (preset === 'business') {
      setEnabled(true);
      setStartHour(8);
      setEndHour(18);
      setAllowedDays([1, 2, 3, 4, 5]);
    } else if (preset === 'extended') {
      setEnabled(true);
      setStartHour(8);
      setEndHour(22);
      setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
    } else {
      // 24/7 → desliga restrição
      setEnabled(false);
      setStartHour(0);
      setEndHour(23);
      setAllowedDays([0, 1, 2, 3, 4, 5, 6]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Horários de Envio
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Defina os dias e horários permitidos para envio automático.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Atalhos rápidos */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => applyPreset('business')}>
              <Briefcase className="h-3 w-3 mr-1" /> Comercial
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('extended')}>
              <Sun className="h-3 w-3 mr-1" /> Estendido
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset('always')}>
              <InfinityIcon className="h-3 w-3 mr-1" /> 24/7
            </Button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Restringir horários</Label>
              <p className="text-xs text-muted-foreground">
                Mensagens fora do horário ficam em fila
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {enabled && (
            <>
              {/* Linha horizontal: Clock | Start até End */}
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={startHour.toString()} onValueChange={v => setStartHour(Number(v))}>
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map(h => (
                      <SelectItem key={h} value={h.toString()}>
                        {h.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground shrink-0">até</span>
                <Select value={endHour.toString()} onValueChange={v => setEndHour(Number(v))}>
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HOURS.map(h => (
                      <SelectItem key={h} value={h.toString()}>
                        {h.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Day pills */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Dias permitidos</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS_OF_WEEK.map(day => {
                    const isActive = allowedDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={cn(
                          "h-9 w-9 rounded-full text-xs font-medium border transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-foreground"
                        )}
                        aria-pressed={isActive}
                      >
                        {day.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-muted/50 border">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Fuso horário: América/São Paulo (BRT)
                </p>
              </div>
            </>
          )}

          {hasChanges && (
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || (enabled && allowedDays.length === 0)}
              className="w-full sm:w-auto"
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Save className="mr-1 h-3 w-3" />
              )}
              Salvar Horários
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
