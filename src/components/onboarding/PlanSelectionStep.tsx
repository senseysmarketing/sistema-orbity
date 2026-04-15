import { useState, useEffect } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { trackViewContent, trackAddToCart, trackPlanSelected } from '@/lib/metaPixel';

interface PlanOption {
  id: string;
  slug: string;
  name: string;
  price_monthly: number;
  price_yearly?: number;
}

export function PlanSelectionStep() {
  const { onboardingData, updatePlanSelection, initiateCheckout, nextStep, prevStep } = useOnboarding();
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'annual'>(
    onboardingData.planSlug === 'orbity_monthly' ? 'monthly' : 'annual'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (plans.length > 0) {
      trackViewContent({
        content_name: 'Billing Cycle Selection',
        content_category: 'Onboarding',
        content_ids: plans.map(p => p.slug),
      });
    }
  }, [plans]);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, slug, price_monthly, price_yearly')
        .eq('is_active', true)
        .in('slug', ['orbity_monthly', 'orbity_annual']);

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const getPlan = (cycle: 'monthly' | 'annual') => {
    const slug = cycle === 'monthly' ? 'orbity_monthly' : 'orbity_annual';
    return plans.find(p => p.slug === slug);
  };

  const handleSelect = (cycle: 'monthly' | 'annual') => {
    setSelectedCycle(cycle);
    const plan = getPlan(cycle);
    if (plan) {
      trackAddToCart({
        content_name: plan.name,
        content_ids: [plan.slug],
        value: plan.price_monthly,
        currency: 'BRL',
      });
      trackPlanSelected({
        plan_name: plan.name,
        plan_slug: plan.slug,
        plan_price: plan.price_monthly,
        is_trial: false,
      });
    }
  };

  const handleContinue = async () => {
    const plan = getPlan(selectedCycle);
    if (!plan) {
      toast.error('Plano não encontrado. Tente recarregar a página.');
      return;
    }

    updatePlanSelection(plan.slug);

    if (!onboardingData.companyData || !onboardingData.adminUser) {
      toast.info('Complete os dados do administrador para prosseguir com o pagamento.');
      nextStep();
      return;
    }

    await initiateCheckout(plan.slug);
  };

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-48 bg-muted rounded" />
              <div className="h-48 bg-muted rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const monthlyPlan = getPlan('monthly');
  const annualPlan = getPlan('annual');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Escolha o Ciclo de Faturação</h2>
          <p className="text-muted-foreground">
            Plano único com acesso total. Escolha como prefere pagar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mensal */}
          <button
            onClick={() => handleSelect('monthly')}
            className={`relative rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
              selectedCycle === 'monthly'
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-border hover:border-primary/40 hover:shadow-md'
            }`}
          >
            <div className="space-y-3">
              <p className="font-semibold text-lg">Mensal</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">R$ {monthlyPlan?.price_monthly ?? 397}</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground">Sem fidelidade. Cancele quando quiser.</p>
            </div>
            {selectedCycle === 'monthly' && (
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            )}
          </button>

          {/* Anual */}
          <button
            onClick={() => handleSelect('annual')}
            className={`relative rounded-2xl border-2 p-6 text-left transition-all duration-200 ${
              selectedCycle === 'annual'
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-border hover:border-primary/40 hover:shadow-md'
            }`}
          >
            <Badge className="absolute -top-3 left-4 bg-green-500 hover:bg-green-600 text-white text-xs">
              Economia de R$ 1.200
            </Badge>
            <div className="space-y-3 mt-1">
              <p className="font-semibold text-lg">Anual</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">R$ {annualPlan?.price_monthly ?? 297}</span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground">R$ 3.564 faturados anualmente.</p>
            </div>
            {selectedCycle === 'annual' && (
              <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            )}
          </button>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={prevStep}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleContinue}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
