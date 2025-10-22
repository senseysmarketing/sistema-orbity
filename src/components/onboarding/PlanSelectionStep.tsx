import { useState, useEffect } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Crown, Star, Zap, Check } from 'lucide-react';
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
  max_contracts: number;
  max_leads: number;
  max_tasks: number;
  has_crm: boolean;
}

export function PlanSelectionStep() {
  const { onboardingData, updatePlanSelection, nextStep, prevStep } = useOnboarding();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState(onboardingData.planSlug || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
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

  const handleContinue = () => {
    if (!selectedPlan) {
      toast.error('Selecione um plano para continuar');
      return;
    }
    updatePlanSelection(selectedPlan);
    nextStep();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPlanIcon = (planSlug: string) => {
    switch (planSlug) {
      case 'basic':
        return Star;
      case 'professional':
        return Zap;
      case 'enterprise':
        return Crown;
      default:
        return Star;
    }
  };

  const getPlanFeatures = (plan: SubscriptionPlan) => {
    const features = [
      plan.max_users >= 999999 ? 'Usuários ilimitados' : `${plan.max_users} usuários`,
      plan.max_clients >= 999999 ? 'Clientes ilimitados' : `${plan.max_clients} clientes`,
      plan.max_contracts >= 999999 ? 'Contratos ilimitados' : `${plan.max_contracts} contratos`,
      plan.max_leads >= 999999 ? 'Leads ilimitados' : `${plan.max_leads} leads`,
      plan.max_tasks >= 999999 ? 'Tarefas ilimitadas' : `${plan.max_tasks} tarefas`,
    ];

    if (plan.has_crm) features.push('CRM Completo');
    features.push('Planner Social Media');

    return features;
  };

  if (loading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8">
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
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center space-y-4">
        <CardTitle className="text-2xl">Escolha Seu Plano</CardTitle>
        <p className="text-muted-foreground">
          Comece com 7 dias grátis! Você poderá alterar seu plano a qualquer momento.
        </p>
        <Badge variant="secondary" className="mx-auto">
          🎉 Trial gratuito de 7 dias em todos os planos
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const Icon = getPlanIcon(plan.slug);
            const isSelected = selectedPlan === plan.slug;
            const features = getPlanFeatures(plan);

            return (
              <Card 
                key={plan.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'ring-2 ring-primary shadow-lg scale-105' 
                    : 'hover:shadow-md hover:scale-102'
                }`}
                onClick={() => setSelectedPlan(plan.slug)}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-primary">
                    {formatCurrency(plan.price_monthly)}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {isSelected && (
                    <Badge className="w-full justify-center">
                      Plano Selecionado
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleContinue} disabled={!selectedPlan}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}