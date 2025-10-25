import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgency } from "@/hooks/useAgency";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high';
  value: number;
  notes: string | null;
  assigned_to: string | null;
  last_contact: string | null;
  next_contact: string | null;
  tags: string[] | null;
  custom_fields: any;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface LeadFormProps {
  lead?: Lead | null;
  onSave: (savedLead: Lead) => void;
  onCancel: () => void;
}

export function LeadForm({ lead, onSave, onCancel }: LeadFormProps) {
  const { profile } = useAuth();
  const { currentAgency } = useAgency();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'manual',
    status: 'new' as 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost',
    priority: 'medium' as 'low' | 'medium' | 'high',
    value: 0,
    notes: '',
    assigned_to: '',
    last_contact: '',
    next_contact: '',
    tags: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        company: lead.company || '',
        position: lead.position || '',
        source: lead.source || 'manual',
        status: lead.status || 'new',
        priority: lead.priority || 'medium',
        value: lead.value || 0,
        notes: lead.notes || '',
        assigned_to: lead.assigned_to || '',
        last_contact: lead.last_contact || '',
        next_contact: lead.next_contact || '',
        tags: lead.tags ? lead.tags.join(', ') : '',
      });
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentAgency?.id || !profile?.user_id) {
      toast.error('Agência ou usuário não encontrado');
      return;
    }

    setLoading(true);

    try {
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const leadData = {
        agency_id: currentAgency.id,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        company: formData.company || null,
        position: formData.position || null,
        source: formData.source,
        status: formData.status,
        priority: formData.priority,
        value: formData.value,
        notes: formData.notes || null,
        assigned_to: formData.assigned_to || null,
        last_contact: formData.last_contact || null,
        next_contact: formData.next_contact || null,
        tags: tags.length > 0 ? tags : null,
        custom_fields: {},
        updated_at: new Date().toISOString(),
      };

      if (lead) {
        // Update existing lead
        const finalUpdates: any = { ...leadData };
        
        // Reset follow_up_notification_sent_at if last_contact changed
        if (leadData.last_contact !== lead.last_contact) {
          finalUpdates.follow_up_notification_sent_at = null;
        }
        
        const { error } = await supabase
          .from('leads')
          .update(finalUpdates)
          .eq('id', lead.id);

        if (error) throw error;
        
        toast.success('Lead atualizado com sucesso');
        
        // Return updated lead data
        onSave({
          ...lead,
          ...leadData,
          id: lead.id,
        } as Lead);
      } else {
        // Create new lead
        const { data, error } = await supabase
          .from('leads')
          .insert({
            ...leadData,
            created_by: profile.user_id,
            follow_up_notification_sent_at: null,
          })
          .select()
          .single();

        if (error) throw error;
        
        toast.success('Lead criado com sucesso');
        
        // Return newly created lead
        onSave(data as Lead);
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Erro ao salvar lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Origem</Label>
              <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="social_media">Redes Sociais</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="referral">Indicação</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                  <SelectItem value="advertisement">Anúncio</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Novo</SelectItem>
                  <SelectItem value="contacted">Contatado</SelectItem>
                  <SelectItem value="qualified">Qualificado</SelectItem>
                  <SelectItem value="proposal">Proposta</SelectItem>
                  <SelectItem value="negotiation">Negociação</SelectItem>
                  <SelectItem value="won">Ganho</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                min="0"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="last_contact">Último Contato</Label>
              <Input
                id="last_contact"
                type="date"
                value={formData.last_contact}
                onChange={(e) => setFormData({ ...formData, last_contact: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_contact">Próximo Contato</Label>
              <Input
                id="next_contact"
                type="date"
                value={formData.next_contact}
                onChange={(e) => setFormData({ ...formData, next_contact: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="ex: cliente vip, urgente, follow-up"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (lead ? 'Atualizar' : 'Criar')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}