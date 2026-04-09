import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Copy, Check, Link } from 'lucide-react';
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

  // Success state with invite link
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setAgencyName('');
    setOwnerName('');
    setEmail('');
    setWhatsapp('');
    setMonthlyValue('');
    setInviteLink(null);
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!agencyName.trim() || !ownerName.trim() || !email.trim()) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      // 1. Create slug from agency name
      const slug = agencyName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

      // 2. Create agency directly
      const { data: agency, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          name: agencyName.trim(),
          slug,
          contact_email: email.trim(),
          contact_phone: whatsapp ? '55' + whatsapp.replace(/\D/g, '') : null,
          monthly_value: monthlyValue ? parseFloat(monthlyValue) : null,
        } as any)
        .select('id')
        .single();

      if (agencyError) throw agencyError;

      // 3. Create invite record
      const { data: invite, error: inviteError } = await supabase
        .from('agency_invites')
        .insert({
          agency_id: agency.id,
          email: email.trim(),
          owner_name: ownerName.trim(),
        } as any)
        .select('token')
        .single();

      if (inviteError) throw inviteError;

      // 4. Build invite link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/register?token=${invite.token}`;
      setInviteLink(link);

      toast.success('Agência criada! Envie o link de cadastro para o responsável.');
      onCreated?.();
    } catch (error: any) {
      console.error('Error creating agency:', error);
      toast.error(error.message || 'Erro ao cadastrar agência');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) resetForm();
    setOpen(openState);
  };

  const isValid = agencyName.trim() && ownerName.trim() && email.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar Nova Agência
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {inviteLink ? 'Link de Cadastro Gerado' : 'Cadastrar Nova Agência'}
          </DialogTitle>
        </DialogHeader>

        {inviteLink ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link className="h-4 w-4 text-primary" />
                Link de convite para <strong>{ownerName}</strong>
              </div>
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs bg-background" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Envie este link para <strong>{email}</strong> via WhatsApp ou e-mail. O link expira em 7 dias.
              </p>
            </div>
            <Button className="w-full" variant="outline" onClick={() => handleClose(false)}>
              Fechar
            </Button>
          </div>
        ) : (
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
        )}
      </DialogContent>
    </Dialog>
  );
}
