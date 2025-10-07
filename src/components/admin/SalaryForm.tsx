import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";

interface SalaryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  salary?: any;
}

export function SalaryForm({ open, onOpenChange, onSuccess, salary }: SalaryFormProps) {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_name: salary?.employee_name || '',
    amount: salary?.amount || '',
    due_date: salary?.due_date ? salary.due_date.split('T')[0] : '',
    paid_date: salary?.paid_date ? salary.paid_date.split('T')[0] : '',
    status: salary?.status || 'pending',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount as string),
        paid_date: formData.paid_date || null,
        agency_id: currentAgency?.id,
      };

      if (salary) {
        const { error } = await supabase
          .from('salaries')
          .update(data)
          .eq('id', salary.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salaries')
          .insert([data]);
        if (error) throw error;
      }

      toast({
        title: salary ? "Salário atualizado" : "Salário criado",
        description: salary ? "Salário atualizado com sucesso!" : "Novo salário criado com sucesso!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{salary ? 'Editar Salário' : 'Novo Salário'}</DialogTitle>
          <DialogDescription>
            {salary ? 'Edite as informações do salário.' : 'Adicione um novo salário ao sistema.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="employee_name">Nome do Funcionário *</Label>
              <Input
                id="employee_name"
                value={formData.employee_name}
                onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="due_date">Data de Vencimento *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.status === 'paid' && (
              <div className="grid gap-2">
                <Label htmlFor="paid_date">Data de Pagamento</Label>
                <Input
                  id="paid_date"
                  type="date"
                  value={formData.paid_date}
                  onChange={(e) => setFormData({ ...formData, paid_date: e.target.value })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (salary ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}