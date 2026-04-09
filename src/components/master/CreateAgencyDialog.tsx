import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

interface CreateAgencyDialogProps {
  onCreated?: () => void;
}

export function CreateAgencyDialog({ onCreated }: CreateAgencyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agencyName, setAgencyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [monthlyValue, setMonthlyValue] = useState('');

  const resetForm = () => {
    setAgencyName('');
    setOwnerName('');
    setEmail('');
    setWhatsapp('');
    setMonthlyValue('');
  };

  const handleSubmit = async () => {
    if (!agencyName.trim() || !ownerName.trim() || !email.trim()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      // Call the agency-onboarding edge function to create agency + admin user
      const { data, error } = await supabase.functions.invoke('agency-onboarding', {
        body: {
          agencyName: agencyName.trim(),
          ownerName: ownerName.trim(),
          email: email.trim(),
          phone: whatsapp ? '55' + whatsapp.replace(/\D/g, '') : undefined,
        },
      });

      if (error) throw error;

      const agencyId = data?.agency_id;

      // Update monthly_value on the newly created agency
      if (agencyId && monthlyValue) {
        await supabase
          .from('agencies')
          .update({ monthly_value: parseFloat(monthlyValue) } as any)
          .eq('id', agencyId);
      }

      // TODO: Integrar com a API da Stripe para criar uma Subscription
      // com o valor mensal personalizado (monthlyValue) para esta agência.
      // Exemplo: stripe.subscriptions.create({ customer: stripeCustomerId, items: [{ price_data: { unit_amount: monthlyValue * 100, ... } }] })

      toast.success('Agência cadastrada com sucesso!');
      resetForm();
      setOpen(false);
      onCreated?.();
    } catch (error: any) {
      console.error('Error creating agency:', error);
      toast.error(error.message || 'Erro ao cadastrar agência');
    } finally {
      setLoading(false);
    }
  };

  const isValid = agencyName.trim() && ownerName.trim() && email.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar Nova Agência
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar Nova Agência</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nome da Agência *</Label>
            <Input placeholder="Ex: Agência XYZ" value={agencyName} onChange={e => setAgencyName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Nome do Responsável *</Label>
            <Input placeholder="Nome completo" value={ownerName} onChange={e => setOwnerName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>E-mail *</Label>
            <Input type="email" placeholder="email@agencia.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>WhatsApp</Label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground shrink-0">+55</div>
              <Input
                placeholder="(00) 00000-0000"
                value={whatsapp}
                onChange={e => setWhatsapp(formatPhoneBR(e.target.value))}
                maxLength={15}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Valor Mensal do Contrato (R$)</Label>
            <Input type="number" placeholder="Ex: 997" value={monthlyValue} onChange={e => setMonthlyValue(e.target.value)} />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!isValid || loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Criando...</> : 'Cadastrar Agência'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
