import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerDemo } from "@/components/ui/date-picker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLimitEnforcement } from "@/hooks/useLimitEnforcement";

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  client?: any;
}

export function ClientForm({ open, onOpenChange, onSuccess, client }: ClientFormProps) {
  const { toast } = useToast();
  const { enforceLimitWithToast } = useLimitEnforcement();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    service: '',
    monthly_value: '',
    active: true,
    start_date: '',
    due_date: '1',
    observations: '',
    contract_start_date: null,
    contract_end_date: null,
    has_loyalty: true,
  });

  // Atualizar formulário quando cliente mudar
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        contact: client.contact || '',
        service: client.service || '',
        monthly_value: client.monthly_value?.toString() || '',
        active: client.active ?? true,
        start_date: client.start_date || '',
        due_date: client.due_date?.toString() || '1',
        observations: client.observations || '',
        contract_start_date: client.contract_start_date || null,
        contract_end_date: client.contract_end_date || null,
        has_loyalty: client.has_loyalty ?? true,
      });
    } else {
      // Resetar formulário para novo cliente
      setFormData({
        name: '',
        contact: '',
        service: '',
        monthly_value: '',
        active: true,
        start_date: '',
        due_date: '1',
        observations: '',
        contract_start_date: null,
        contract_end_date: null,
        has_loyalty: true,
      });
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields for loyalty clients
    if (formData.has_loyalty && (!formData.contract_start_date || !formData.contract_end_date)) {
      toast({
        title: "Campos obrigatórios",
        description: "Para clientes com fidelidade, as datas de início e fim do contrato são obrigatórias.",
        variant: "destructive",
      });
      return;
    }
    
    // Check limit only for new clients
    if (!client) {
      const canCreate = enforceLimitWithToast('clients', 'adicionar novo cliente');
      if (!canCreate) return;
    }
    
    setLoading(true);

    try {
      const data = {
        ...formData,
        monthly_value: formData.monthly_value ? parseFloat(formData.monthly_value) : null,
        start_date: formData.start_date || null,
        due_date: parseInt(formData.due_date),
        contract_start_date: formData.contract_start_date,
        contract_end_date: formData.contract_end_date,
        has_loyalty: formData.has_loyalty,
      };

      if (client) {
        const { error } = await supabase
          .from('clients')
          .update(data)
          .eq('id', client.id);
        if (error) throw error;
      } else {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .insert([data])
          .select()
          .single();
        
        if (clientError) throw clientError;

        // Criar pagamento automático para o cliente
        if (clientData && formData.monthly_value) {
          const currentDate = new Date();
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth();
          
          // Calcular a data de vencimento para o mês atual
          const dueDate = new Date(currentYear, currentMonth, parseInt(formData.due_date));
          
          const { error: paymentError } = await supabase
            .from('client_payments')
            .insert([{
              client_id: clientData.id,
              amount: parseFloat(formData.monthly_value),
              due_date: dueDate.toISOString().split('T')[0],
              status: 'pending'
            }]);
          
          if (paymentError) {
            console.error('Erro ao criar pagamento automático:', paymentError);
          }
        }
      }

      toast({
        title: client ? "Cliente atualizado" : "Cliente criado",
        description: client ? "Cliente atualizado com sucesso!" : "Novo cliente criado com sucesso!",
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        name: '',
        contact: '',
        service: '',
        monthly_value: '',
        active: true,
        start_date: '',
        due_date: '1',
        observations: '',
        contract_start_date: null,
        contract_end_date: null,
        has_loyalty: true,
      });
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
          <DialogTitle>{client ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {client ? 'Edite as informações do cliente.' : 'Adicione um novo cliente ao sistema.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact">Contato</Label>
              <Input
                id="contact"
                value={formData.contact}
                onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                placeholder="Email, telefone, etc."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="service">Serviço</Label>
              <Input
                id="service"
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                placeholder="Tipo de serviço prestado"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="monthly_value">Valor Mensal</Label>
              <Input
                id="monthly_value"
                type="number"
                step="0.01"
                value={formData.monthly_value}
                onChange={(e) => setFormData({ ...formData, monthly_value: e.target.value })}
                placeholder="0,00"
              />
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
            <div className="grid gap-2">
              <Label>Fidelidade</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="has_loyalty"
                  checked={formData.has_loyalty}
                  onCheckedChange={(checked) => setFormData({ ...formData, has_loyalty: checked })}
                />
                <Label htmlFor="has_loyalty">Cliente tem fidelidade</Label>
              </div>
            </div>
            {formData.has_loyalty && (
              <>
                <div className="grid gap-2">
                  <Label>Início do Contrato *</Label>
                  <DatePickerDemo
                    date={formData.contract_start_date ? new Date(formData.contract_start_date) : undefined}
                    onDateChange={(date) => setFormData({ 
                      ...formData, 
                      contract_start_date: date ? date.toISOString().split('T')[0] : null 
                    })}
                    placeholder="Selecione a data de início"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Fim do Contrato *</Label>
                  <DatePickerDemo
                    date={formData.contract_end_date ? new Date(formData.contract_end_date) : undefined}
                    onDateChange={(date) => setFormData({ 
                      ...formData, 
                      contract_end_date: date ? date.toISOString().split('T')[0] : null 
                    })}
                    placeholder="Selecione a data de fim"
                  />
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label htmlFor="due_date">Dia de Vencimento *</Label>
              <Select 
                value={formData.due_date.toString()} 
                onValueChange={(value) => setFormData({ ...formData, due_date: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o dia" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      Dia {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="observations">Observações</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Observações adicionais"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Cliente Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (client ? 'Atualizar' : 'Criar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}