import * as React from "react";
import type { DateRange } from "react-day-picker";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PresetKey = "today" | "this_week" | "this_month" | "last_7_days";

export interface DateRangeFilterDialogProps {
  value: DateRange | undefined;
  onChange: (next: DateRange | undefined) => void;

  includeNoDate: boolean;
  onIncludeNoDateChange: (next: boolean) => void;
  defaultIncludeNoDate?: boolean;

  label?: string;
  active?: boolean;
  className?: string;
}

function getPresetRange(preset: PresetKey, now = new Date()): DateRange {
  switch (preset) {
    case "today":
      return { from: now, to: now };
    case "this_week":
      return {
        from: startOfWeek(now, { locale: ptBR }),
        to: endOfWeek(now, { locale: ptBR }),
      };
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last_7_days":
      return { from: subDays(now, 6), to: now };
  }
}

export function DateRangeFilterDialog({
  value,
  onChange,
  includeNoDate,
  onIncludeNoDateChange,
  defaultIncludeNoDate = false,
  label = "Período",
  active = false,
  className,
}: DateRangeFilterDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(value);
  const [tempIncludeNoDate, setTempIncludeNoDate] = React.useState(includeNoDate);

  React.useEffect(() => {
    if (!open) return;
    setTempRange(value);
    setTempIncludeNoDate(includeNoDate);
  }, [open, value, includeNoDate]);

  const handlePreset = (preset: PresetKey) => {
    setTempRange(getPresetRange(preset));
  };

  const handleCancel = () => {
    setTempRange(value);
    setTempIncludeNoDate(includeNoDate);
    setOpen(false);
  };

  const handleClear = () => {
    setTempRange(undefined);
    setTempIncludeNoDate(defaultIncludeNoDate);
  };

  const handleApply = () => {
    onChange(tempRange);
    onIncludeNoDateChange(tempIncludeNoDate);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "relative h-10 w-[140px] justify-between px-3 py-2 text-sm font-normal",
            active && "ring-1 ring-ring",
            className,
          )}
        >
          <span className="flex items-center gap-2">
            {label}
            {active && <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>Filtro de período</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="text-sm font-medium">Atalhos</div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => handlePreset("today")}>
                Hoje
              </Button>
              <Button type="button" variant="secondary" onClick={() => handlePreset("this_week")}>
                Esta semana
              </Button>
              <Button type="button" variant="secondary" onClick={() => handlePreset("this_month")}>
                Este mês
              </Button>
              <Button type="button" variant="secondary" onClick={() => handlePreset("last_7_days")}>
                Últimos 7 dias
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Personalizado</div>
            <DateRangePicker
              date={tempRange}
              onDateChange={setTempRange}
              className="[&_button#date]:h-10"
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="include-no-date-toggle" className="text-sm">
                Incluir sem data
              </Label>
              <div className="text-xs text-muted-foreground">
                Mantém itens sem data visíveis mesmo com período aplicado.
              </div>
            </div>
            <Switch
              id="include-no-date-toggle"
              checked={tempIncludeNoDate}
              onCheckedChange={setTempIncludeNoDate}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="outline" onClick={handleClear}>
            Limpar
          </Button>
          <Button type="button" onClick={handleApply}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
