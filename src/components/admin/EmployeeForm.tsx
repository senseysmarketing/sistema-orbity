import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";

interface Employee {
  id: string;
  name: string;
  base_salary: number;
  role?: string;
  payment_day: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
}

interface EmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  employee?: Employee | null;
}

export function EmployeeForm({ open, onOpenChange, onSuccess, employee }: EmployeeFormProps) {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    base_salary: '',
    role: '',
    payment_day: '5',
    is_active: true,
    start_date: '',
  });

  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        base_salary: employee.base_salary?.toString() || '',
        role: employee.role || '',
        payment_day: employee.payment_day?.toString() || '5',
        is_active: employee.is_active ?? true,
        start_date: employee.start_date ? employee.start_date.split('T')[0] : '',
      });
    } else {
      setFormData({
        name: '',
        base_salary: '',
        role: '',
        payment_day: '5',
        is_active: true,
        start_date: '',
      });
    }
  }, [employee, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        name: formData.name,
        base_salary: parseFloat(formData.base_salary),
        role: formData.role || null,
        payment_day: parseInt(formData.payment_day) || 5,
        is_active: formData.is_active,
        start_date: formData.start_date || null,
        agency_id: currentAgency?.id,
      };

      if (employee) {
        const { error } = await supabase
          .from('employees')
          .update(data)
          .eq('id', employee.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employees')
          .insert([data]);
        if (error) throw error;
      }

      toast({
        title: employee ? "Funcionário atualizado" : "Funcionário criado",
        description: employee ? "Funcionário atualizado com sucesso!" : "Novo funcionário criado com sucesso!",
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
          <DialogTitle>{employee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
          <DialogDescription>
            {employee 
              ? 'Edite as informações do funcionário.' 
              : 'Adicione um novo funcionário. Salários mensais serão gerados automaticamente.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Funcionário *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="role">Cargo/Função</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Ex: Designer, Desenvolvedor..."
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="base_salary">Salário Base *</Label>
              <Input
                id="base_salary"
                type="number"
                step="0.01"
                value={formData.base_salary}
                onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="payment_day">Dia de Pagamento *</Label>
              <Input
                id="payment_day"
                type="number"
                min="1"
                max="28"
                value={formData.payment_day}
                onChange={(e) => setFormData({ ...formData, payment_day: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Dia do mês em que o salário vence (1-28)
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="start_date">Data de Início</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Funcionário Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Funcionários ativos geram salários automaticamente
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (employee ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
