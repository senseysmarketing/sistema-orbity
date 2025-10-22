import { Check, Crown, Zap, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

export function PricingCards() {
  const { plans, currentSubscription, createCheckout, openCustomerPortal, loading } = useSubscription();

  const getPlanIcon = (slug: string) => {
    switch (slug) {
      case 'free': return <Zap className="h-6 w-6" />;
      case 'basic': return <Building className="h-6 w-6" />;
      case 'professional': return <Crown className="h-6 w-6" />;
      case 'enterprise': return <Crown className="h-6 w-6" />;
      default: return <Zap className="h-6 w-6" />;
    }
  };

  const getPlanColor = (slug: string) => {
    switch (slug) {
      case 'free': return 'border-gray-200';
      case 'basic': return 'border-blue-200';
      case 'professional': return 'border-purple-200';
      case 'enterprise': return 'border-orange-200';
      default: return 'border-gray-200';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const isCurrentPlan = (planName: string) => {
    if (currentSubscription?.plan_name !== planName) return false;
    
    // Check if trial is expired
    const isTrialExpired = currentSubscription?.subscription_end && 
      new Date(currentSubscription.subscription_end) <= new Date();
    
    // Only consider current if subscription is ACTIVE (not trial/past_due/unpaid)
    const isActive = currentSubscription?.subscribed && currentSubscription?.subscription_status === 'active';
    return isActive && !isTrialExpired;
  };

  const handlePlanAction = async (plan: any) => {
    if (isCurrentPlan(plan.name)) {
      if (currentSubscription?.subscribed && currentSubscription?.subscription_status === 'active') {
        await openCustomerPortal();
      } else if (plan.stripe_price_id_monthly) {
        await createCheckout(plan.stripe_price_id_monthly);
      }
    } else if (plan.slug === 'free') {
      // Can't downgrade to free through Stripe - would need special handling
      return;
    } else if (plan.stripe_price_id_monthly) {
      await createCheckout(plan.stripe_price_id_monthly);
    }
  };

  const getButtonText = (plan: any) => {
    // Check if trial is expired
    const isTrialExpired = currentSubscription?.subscription_end && 
      new Date(currentSubscription.subscription_end) <= new Date();
    const isActive = currentSubscription?.subscribed && currentSubscription?.subscription_status === 'active';
    
    if (isCurrentPlan(plan.name)) {
      return 'Gerenciar Plano';
    } else if (plan.slug === 'free') {
      return 'Plano Gratuito';
    } else if (isTrialExpired || !isActive) {
      return 'Assinar Plano';
    } else {
      return 'Fazer Upgrade';
    }
  };

  const getButtonVariant = (plan: any) => {
    if (isCurrentPlan(plan.name)) {
      return 'outline';
    } else if (plan.slug === 'professional') {
      return 'default';
    } else {
      return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-muted rounded w-full"></div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <div className="h-10 bg-muted rounded w-full"></div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {plans.map((plan) => (
        <Card 
          key={plan.id} 
          className={cn(
            "relative transition-all duration-200 hover:shadow-lg",
            getPlanColor(plan.slug),
            isCurrentPlan(plan.name) && "ring-2 ring-primary ring-offset-2"
          )}
        >
          {plan.slug === 'professional' && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                Mais Popular
              </Badge>
            </div>
          )}
          
          {isCurrentPlan(plan.name) && (
            <div className="absolute -top-3 right-4">
              <Badge variant="secondary" className="bg-green-500 text-white">
                Atual
              </Badge>
            </div>
          )}

          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="text-primary mt-1">
                  {getPlanIcon(plan.slug)}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {plan.description}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {plan.price_monthly === 0 ? 'Grátis' : formatPrice(plan.price_monthly)}
                </div>
                {plan.price_monthly > 0 && (
                  <span className="text-sm text-muted-foreground">/mês</span>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  {plan.max_users >= 999999 ? 'Usuários ilimitados' : `${plan.max_users} usuários`}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  {plan.max_clients >= 999999 ? 'Clientes ilimitados' : `${plan.max_clients} clientes`}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  {plan.max_contracts >= 999999 ? 'Contratos ilimitados' : `${plan.max_contracts} contratos`}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  {plan.max_leads >= 999999 ? 'Leads ilimitados' : `${plan.max_leads} leads`}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  {plan.max_tasks >= 999999 ? 'Tarefas ilimitadas' : `${plan.max_tasks} tarefas`}
                </span>
              </div>
              
              {plan.has_crm && (
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">CRM Completo</span>
                </div>
              )}
              
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Planner Social Media</span>
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              className="w-full"
              variant={getButtonVariant(plan)}
              onClick={() => handlePlanAction(plan)}
              disabled={plan.slug === 'free' && !isCurrentPlan(plan.name)}
            >
              {getButtonText(plan)}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}