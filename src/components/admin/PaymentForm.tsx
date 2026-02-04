import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAgency } from "@/hooks/useAgency";

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  payment?: any;
  preselectedClient?: { id: string; name: string; monthly_value?: number | null };
}

export function PaymentForm({ open, onOpenChange, onSuccess, payment, preselectedClient }: PaymentFormProps) {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    due_date: '',
    paid_date: '',
    status: 'pending',
    description: '',
  });

  useEffect(() => {
    fetchClients();
  }, [currentAgency]);

  useEffect(() => {
    // Só processa quando o dialog abre
    if (!open) return;
    
    if (payment) {
      setFormData({
        client_id: payment.client_id || '',
        amount: payment.amount || '',
        due_date: payment.due_date ? payment.due_date.split('T')[0] : '',
        paid_date: payment.paid_date ? payment.paid_date.split('T')[0] : '',
        status: payment.status || 'pending',
        description: payment.description || '',
      });
    } else if (preselectedClient) {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const defaultDueDate = new Date(currentYear, currentMonth, 15);
      
      setFormData({
        client_id: preselectedClient.id,
        amount: preselectedClient.monthly_value?.toString() || '',
        due_date: defaultDueDate.toISOString().split('T')[0],
        paid_date: '',
        status: 'pending',
        description: '',
      });
    } else {
      setFormData({
        client_id: '',
        amount: '',
        due_date: '',
        paid_date: '',
        status: 'pending',
        description: '',
      });
    }
  }, [open, payment, preselectedClient]);

  const fetchClients = async () => {
    if (!currentAgency) return;
    
    const { data } = await supabase
      .from('clients')
      .select('id, name, monthly_value')
      .eq('agency_id', currentAgency.id)
      .eq('active', true)
      .order('name');
    setClients(data || []);
  };

  const handleClientChange = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    setFormData({ 
      ...formData, 
      client_id: clientId,
      amount: selectedClient?.monthly_value?.toString() || formData.amount
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        client_id: formData.client_id,
        amount: parseFloat(formData.amount as string),
        due_date: formData.due_date,
        paid_date: formData.paid_date || null,
        status: formData.status as 'pending' | 'paid' | 'overdue',
        description: formData.description || null,
        agency_id: currentAgency?.id,
      };

      if (payment) {
        const { error } = await supabase
          .from('client_payments')
          .update(data)
          .eq('id', payment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_payments')
          .insert([data]);
        if (error) throw error;
      }

      toast({
        title: payment ? "Pagamento atualizado" : "Pagamento criado",
        description: payment ? "Pagamento atualizado com sucesso!" : "Novo pagamento criado com sucesso!",
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{payment ? 'Editar Pagamento' : 'Novo Pagamento'}</DialogTitle>
          <DialogDescription>
            {payment ? 'Edite as informações do pagamento.' : 'Adicione um novo pagamento ou serviço extra.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="client_id">Cliente *</Label>
              {preselectedClient ? (
                <Input
                  value={preselectedClient.name}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
              ) : (
                <Select
                  value={formData.client_id}
                  onValueChange={handleClientChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Valor *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0,00"
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
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Mensalidade, Serviço extra, Criação de landing page..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (payment ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}