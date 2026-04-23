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
import { usePaymentGateway } from "@/hooks/usePaymentGateway";

interface PaymentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  payment?: any;
  preselectedClient?: { id: string; name: string; monthly_value?: number | null; default_billing_type?: string };
}

export function PaymentForm({ open, onOpenChange, onSuccess, payment, preselectedClient }: PaymentFormProps) {
  const { toast } = useToast();
  const { currentAgency } = useAgency();
  const { enabledGateways } = usePaymentGateway();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    client_id: '',
    amount: '',
    due_date: '',
    paid_date: '',
    status: 'pending',
    description: '',
    billing_type: 'manual',
  });

  useEffect(() => {
    fetchClients();
  }, [currentAgency]);

  useEffect(() => {
    if (!open) return;
    
    if (payment) {
      setFormData({
        client_id: payment.client_id || '',
        amount: payment.amount || '',
        due_date: payment.due_date ? payment.due_date.split('T')[0] : '',
        paid_date: payment.paid_date ? payment.paid_date.split('T')[0] : '',
        status: payment.status || 'pending',
        description: payment.description || '',
        billing_type: payment.billing_type || 'manual',
      });
    } else if (preselectedClient) {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const defaultDueDate = new Date(currentYear, currentMonth, 15);
      const resolvedBillingType = enabledGateways.includes(preselectedClient.default_billing_type || 'manual')
        ? (preselectedClient.default_billing_type || 'manual')
        : 'manual';
      
      setFormData({
        client_id: preselectedClient.id,
        amount: preselectedClient.monthly_value?.toString() || '',
        due_date: defaultDueDate.toISOString().split('T')[0],
        paid_date: '',
        status: 'pending',
        description: '',
        billing_type: resolvedBillingType,
      });
    } else {
      setFormData({
        client_id: '',
        amount: '',
        due_date: '',
        paid_date: '',
        status: 'pending',
        description: '',
        billing_type: 'manual',
      });
    }
  }, [open, payment, preselectedClient, enabledGateways]);

  const fetchClients = async () => {
    if (!currentAgency) return;
    
    const { data } = await supabase
      .from('clients')
      .select('id, name, monthly_value, default_billing_type')
      .eq('agency_id', currentAgency.id)
      .eq('active', true)
      .order('name');
    setClients(data || []);
  };

  const handleClientChange = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    const resolvedBillingType = selectedClient?.default_billing_type && enabledGateways.includes(selectedClient.default_billing_type)
      ? selectedClient.default_billing_type
      : 'manual';
    setFormData({ 
      ...formData, 
      client_id: clientId,
      amount: selectedClient?.monthly_value?.toString() || formData.amount,
      billing_type: resolvedBillingType,
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
        billing_type: formData.billing_type,
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

  const billingTypeLabel = (bt: string) => bt === 'manual' ? 'Manual' : bt === 'asaas' ? 'Asaas' : bt === 'stripe' ? 'Stripe' : 'Conexa';

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
                <Label>Método de Faturamento</Label>
                <Select
                  value={formData.billing_type}
                  onValueChange={(value) => setFormData({ ...formData, billing_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {enabledGateways.map((gw) => (
                      <SelectItem key={gw} value={gw}>
                        {billingTypeLabel(gw)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="grid gap-2">
                <Label htmlFor="due_date">Vencimento *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  required
                />
              </div>
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
