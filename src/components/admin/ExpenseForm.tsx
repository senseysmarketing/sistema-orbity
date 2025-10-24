import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";
import { Repeat, Package, CreditCard } from "lucide-react";

interface ExpenseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  expense?: any;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export function ExpenseForm({ open, onOpenChange, onSuccess, expense }: ExpenseFormProps) {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    due_date: '',
    paid_date: '',
    status: 'pending' as 'pending' | 'paid' | 'overdue',
    expense_type: 'avulsa' as 'avulsa' | 'recorrente' | 'parcelada',
    category: '',
    description: '',
    recurrence_day: '',
    installment_total: '',
    installment_amount: '', // Valor de cada parcela
  });

  useEffect(() => {
    if (currentAgency?.id) {
      fetchCategories();
    }
  }, [currentAgency?.id]);

  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name || '',
        amount: expense.amount || '',
        due_date: expense.due_date ? expense.due_date.split('T')[0] : '',
        paid_date: expense.paid_date ? expense.paid_date.split('T')[0] : '',
        status: (expense.status || 'pending') as 'pending' | 'paid' | 'overdue',
        expense_type: (expense.expense_type || 'avulsa') as 'avulsa' | 'recorrente' | 'parcelada',
        category: expense.category || '',
        description: expense.description || '',
        recurrence_day: expense.recurrence_day?.toString() || '',
        installment_total: expense.installment_total?.toString() || '',
        installment_amount: expense.amount || '',
      });
    } else {
      setFormData({
        name: '',
        amount: '',
        due_date: '',
        paid_date: '',
        status: 'pending' as 'pending' | 'paid' | 'overdue',
        expense_type: 'avulsa' as 'avulsa' | 'recorrente' | 'parcelada',
        category: '',
        description: '',
        recurrence_day: '',
        installment_total: '',
        installment_amount: '',
      });
    }
  }, [expense, open]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('agency_id', currentAgency?.id)
      .order('name');

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return;
    }

    setCategories(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações específicas por tipo
      if (formData.expense_type === 'recorrente' && !formData.recurrence_day) {
        toast({
          title: "Erro",
          description: "Despesas recorrentes precisam de um dia de vencimento.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (formData.expense_type === 'parcelada' && (!formData.installment_total || Number(formData.installment_total) < 2)) {
        toast({
          title: "Erro",
          description: "Despesas parceladas precisam de ao menos 2 parcelas.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Para parceladas, calcular o valor total
      let finalAmount = parseFloat(formData.amount as string);
      if (formData.expense_type === 'parcelada' && formData.installment_total) {
        const installmentAmount = parseFloat(formData.installment_amount as string);
        finalAmount = installmentAmount; // Cada parcela tem este valor
      }

      const baseData = {
        name: formData.name,
        amount: finalAmount,
        due_date: formData.due_date,
        paid_date: formData.paid_date || null,
        status: formData.status,
        expense_type: formData.expense_type,
        category: formData.category || null,
        description: formData.description || null,
        recurrence_day: formData.expense_type === 'recorrente' ? parseInt(formData.recurrence_day) : null,
        agency_id: currentAgency?.id,
      };

      if (expense) {
        // Atualizar despesa existente
        const { error } = await supabase
          .from('expenses')
          .update(baseData)
          .eq('id', expense.id);
        if (error) throw error;

        toast({
          title: "Despesa atualizada",
          description: "Despesa atualizada com sucesso!",
        });
      } else {
        // Criar nova despesa
        if (formData.expense_type === 'parcelada') {
          // Criar todas as parcelas
          const totalInstallments = parseInt(formData.installment_total);
          const installmentAmount = parseFloat(formData.installment_amount as string);
          const startDate = new Date(formData.due_date);

          // Criar a primeira parcela (parent)
          const { data: parentExpense, error: parentError } = await supabase
            .from('expenses')
            .insert([{
              ...baseData,
              amount: installmentAmount,
              installment_current: 1,
              installment_total: totalInstallments,
              parent_expense_id: null,
            }])
            .select()
            .single();

          if (parentError) throw parentError;

          // Criar as demais parcelas
          const installments = [];
          for (let i = 2; i <= totalInstallments; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + (i - 1));

            installments.push({
              ...baseData,
              amount: installmentAmount,
              due_date: dueDate.toISOString().split('T')[0],
              installment_current: i,
              installment_total: totalInstallments,
              parent_expense_id: parentExpense.id,
            });
          }

          if (installments.length > 0) {
            const { error: installmentsError } = await supabase
              .from('expenses')
              .insert(installments);
            if (installmentsError) throw installmentsError;
          }

          toast({
            title: "Despesa parcelada criada",
            description: `${totalInstallments} parcelas de ${installmentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} criadas com sucesso!`,
          });
        } else {
          // Criar despesa avulsa ou recorrente
          const { error } = await supabase
            .from('expenses')
            .insert([baseData]);
          if (error) throw error;

          toast({
            title: "Despesa criada",
            description: "Nova despesa criada com sucesso!",
          });
        }
      }

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
          <DialogDescription>
            {expense ? 'Edite as informações da despesa.' : 'Adicione uma nova despesa ao sistema.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Tipo de Despesa */}
            <div className="grid gap-3">
              <Label>Tipo de Despesa *</Label>
              <RadioGroup
                value={formData.expense_type}
                onValueChange={(value) => setFormData({ ...formData, expense_type: value as any })}
                className="grid grid-cols-3 gap-4"
                disabled={!!expense}
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="avulsa" id="avulsa" disabled={!!expense} />
                  <Label htmlFor="avulsa" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Package className="h-4 w-4" />
                    <span>Avulsa</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="recorrente" id="recorrente" disabled={!!expense} />
                  <Label htmlFor="recorrente" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Repeat className="h-4 w-4" />
                    <span>Recorrente</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                  <RadioGroupItem value="parcelada" id="parcelada" disabled={!!expense} />
                  <Label htmlFor="parcelada" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="h-4 w-4" />
                    <span>Parcelada</span>
                  </Label>
                </div>
              </RadioGroup>
              {expense && (
                <p className="text-sm text-muted-foreground">
                  O tipo de despesa não pode ser alterado após a criação.
                </p>
              )}
            </div>

            {/* Nome */}
            <div className="grid gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Categoria */}
            <div className="grid gap-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campos específicos por tipo */}
            {formData.expense_type === 'parcelada' && !expense ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="installment_amount">Valor da Parcela *</Label>
                  <Input
                    id="installment_amount"
                    type="number"
                    step="0.01"
                    value={formData.installment_amount}
                    onChange={(e) => setFormData({ ...formData, installment_amount: e.target.value })}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="installment_total">Número de Parcelas *</Label>
                  <Input
                    id="installment_total"
                    type="number"
                    min="2"
                    max="60"
                    value={formData.installment_total}
                    onChange={(e) => setFormData({ ...formData, installment_total: e.target.value })}
                    required
                  />
                </div>
              </div>
            ) : (
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
            )}

            {/* Valor total para parceladas */}
            {formData.expense_type === 'parcelada' && formData.installment_total && formData.installment_amount && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Valor Total: <span className="font-semibold text-foreground">
                    {(parseFloat(formData.installment_amount) * parseInt(formData.installment_total)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </p>
              </div>
            )}

            {/* Data de Vencimento - Apenas para avulsa e parcelada */}
            {formData.expense_type !== 'recorrente' && (
              <div className="grid gap-2">
                <Label htmlFor="due_date">
                  {formData.expense_type === 'parcelada' ? 'Vencimento da 1ª Parcela *' : 'Data de Vencimento *'}
                </Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
            )}

            {/* Dia de Vencimento para Recorrentes */}
            {formData.expense_type === 'recorrente' && (
              <div className="grid gap-2">
                <Label htmlFor="recurrence_day">Dia do Vencimento (1-31) *</Label>
                <Input
                  id="recurrence_day"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 5 (todo dia 5 do mês)"
                  value={formData.recurrence_day}
                  onChange={(e) => setFormData({ ...formData, recurrence_day: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  A despesa vencerá todo dia {formData.recurrence_day || '__'} de cada mês
                </p>
              </div>
            )}

            {/* Descrição */}
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as 'pending' | 'paid' | 'overdue' })}
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

            {/* Data de Pagamento */}
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
              {loading ? 'Salvando...' : (expense ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
