import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly?: number;
  max_users: number;
  max_clients: number;
  max_leads: number;
  max_tasks: number;
  max_storage_gb: number;
  has_crm: boolean;
  has_advanced_reports: boolean;
  has_api_access: boolean;
  has_white_label: boolean;
  has_priority_support: boolean;
  is_active: boolean;
  stripe_price_id_monthly?: string;
  stripe_price_id_yearly?: string;
}

export function SubscriptionPlansManager() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState<Partial<SubscriptionPlan>>({});
  const [showNewForm, setShowNewForm] = useState(false);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const savePlan = async (plan: Partial<SubscriptionPlan>) => {
    try {
      if (plan.id) {
        // Update existing plan
        const { error } = await supabase
          .from('subscription_plans')
          .update(plan)
          .eq('id', plan.id);
        
        if (error) throw error;
        toast.success('Plano atualizado com sucesso');
      } else {
        // Create new plan
        const { error } = await supabase
          .from('subscription_plans')
          .insert(plan as any);
        
        if (error) throw error;
        toast.success('Plano criado com sucesso');
        setShowNewForm(false);
        setNewPlan({});
      }
      
      setEditingPlan(null);
      await fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Erro ao salvar plano');
    }
  };

  const togglePlanStatus = async (planId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('subscription_plans')
        .update({ is_active: !isActive })
        .eq('id', planId);

      if (error) throw error;
      toast.success(`Plano ${!isActive ? 'ativado' : 'desativado'} com sucesso`);
      await fetchPlans();
    } catch (error) {
      console.error('Error toggling plan status:', error);
      toast.error('Erro ao alterar status do plano');
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestão de Planos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestão de Planos de Assinatura</CardTitle>
        <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {showNewForm && (
          <Card className="border-2 border-dashed border-primary">
            <CardHeader>
              <CardTitle>Novo Plano</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome do Plano</Label>
                  <Input
                    id="name"
                    value={newPlan.name || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={newPlan.slug || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, slug: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newPlan.description || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price_monthly">Preço Mensal (R$)</Label>
                  <Input
                    id="price_monthly"
                    type="number"
                    value={newPlan.price_monthly || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, price_monthly: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="price_yearly">Preço Anual (R$)</Label>
                  <Input
                    id="price_yearly"
                    type="number"
                    value={newPlan.price_yearly || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, price_yearly: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="max_users">Max Usuários</Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={newPlan.max_users || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, max_users: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_clients">Max Clientes</Label>
                  <Input
                    id="max_clients"
                    type="number"
                    value={newPlan.max_clients || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, max_clients: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_leads">Max Leads</Label>
                  <Input
                    id="max_leads"
                    type="number"
                    value={newPlan.max_leads || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, max_leads: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_tasks">Max Tarefas</Label>
                  <Input
                    id="max_tasks"
                    type="number"
                    value={newPlan.max_tasks || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, max_tasks: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_storage_gb">Storage (GB)</Label>
                  <Input
                    id="max_storage_gb"
                    type="number"
                    value={newPlan.max_storage_gb || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, max_storage_gb: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewForm(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={() => savePlan(newPlan)}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center space-x-4">
                <CardTitle>{plan.name}</CardTitle>
                <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                  {plan.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={plan.is_active}
                  onCheckedChange={() => togglePlanStatus(plan.id, plan.is_active)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPlan(editingPlan === plan.id ? null : plan.id)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Preço Mensal:</span>
                  <p>{formatCurrency(plan.price_monthly)}</p>
                </div>
                <div>
                  <span className="font-medium">Max Usuários:</span>
                  <p>{plan.max_users}</p>
                </div>
                <div>
                  <span className="font-medium">Max Clientes:</span>
                  <p>{plan.max_clients}</p>
                </div>
                <div>
                  <span className="font-medium">Storage:</span>
                  <p>{plan.max_storage_gb}GB</p>
                </div>
              </div>
              
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                {plan.has_crm && <Badge variant="outline">CRM</Badge>}
                {plan.has_advanced_reports && <Badge variant="outline">Relatórios Avançados</Badge>}
                {plan.has_api_access && <Badge variant="outline">API Access</Badge>}
                {plan.has_white_label && <Badge variant="outline">White Label</Badge>}
                {plan.has_priority_support && <Badge variant="outline">Suporte Prioritário</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}