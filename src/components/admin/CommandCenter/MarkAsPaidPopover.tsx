import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";

interface MarkAsPaidPopoverProps {
  originalAmount: number;
  onConfirm: (paidDate: string, paidAmount: number) => void;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function MarkAsPaidPopover({ originalAmount, onConfirm, isLoading, children }: MarkAsPaidPopoverProps) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const [paidDate, setPaidDate] = useState(today);
  const [paidAmount, setPaidAmount] = useState(originalAmount.toString());

  const handleConfirm = () => {
    onConfirm(paidDate, parseFloat(paidAmount));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) { setPaidDate(today); setPaidAmount(originalAmount.toString()); } }}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30">
            <CheckCircle className="h-3.5 w-3.5" />
            Dar Baixa
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-3">
          <p className="text-sm font-medium">Confirmar Baixa</p>
          <div className="space-y-2">
            <Label htmlFor="paid-date" className="text-xs">Data do Pagamento</Label>
            <Input
              id="paid-date"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paid-amount" className="text-xs">Valor Pago (R$)</Label>
            <Input
              id="paid-amount"
              type="number"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <Button onClick={handleConfirm} disabled={isLoading} size="sm" className="w-full">
            {isLoading ? 'Registrando...' : 'Confirmar Baixa'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
